---
id: dependencies-lockfile
type: index
depth_role: subcategory
depth: 1
focus: Abandoned libraries from archived repos or with no recent commits; Abandoned packages still in dependencies; AppImage without embedded signature or zsync info; Build isolation disabled allowing host contamination
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: build-bazel-buck-pants
    file: build-bazel-buck-pants.md
    type: primary
    focus: Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts
    tags:
      - bazel
      - buck
      - buck2
      - pants
      - build-system
      - hermetic
      - remote-cache
      - genrule
      - workspace
      - dependencies
  - id: build-bundler
    file: build-bundler.md
    type: primary
    focus: Detect Bundler misconfigurations including missing Gemfile.lock, unpinned gem versions, git source gems without ref pinning, platform-specific gem omissions, and missing Ruby version requirements
    tags:
      - bundler
      - ruby
      - gems
      - gemfile
      - lockfile
      - rubygems
      - platform
      - pinning
      - dependencies
  - id: build-cargo
    file: build-cargo.md
    type: primary
    focus: Detect Cargo misconfigurations including missing Cargo.lock in binary crates, wildcard dependencies, unsafe build scripts, missing edition declaration, and undocumented features
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
  - id: build-composer
    file: build-composer.md
    type: primary
    focus: Detect Composer misconfigurations including missing composer.lock, wildcard versions, scripts with shell commands, missing platform config, and dev dependencies in production autoload
    tags:
      - composer
      - php
      - packagist
      - lockfile
      - autoload
      - platform
      - dependencies
      - scripts
  - id: build-go-modules
    file: build-go-modules.md
    type: primary
    focus: Detect Go module misconfigurations including missing go.sum, committed replace directives, missing toolchain directive, vendor directory inconsistencies, and untidied indirect dependencies
    tags:
      - go
      - modules
      - go-mod
      - go-sum
      - vendor
      - replace
      - toolchain
      - checksum
      - dependencies
  - id: build-lockfile-hygiene
    file: build-lockfile-hygiene.md
    type: primary
    focus: Detect lockfile mismanagement across all package managers including uncommitted lockfiles, out-of-sync lockfiles, unreviewed lockfile diffs, missing integrity hashes, and improperly resolved merge conflicts
    tags:
      - lockfile
      - integrity
      - hashes
      - deterministic
      - reproducible
      - sync
      - merge-conflict
      - frozen-install
      - dependencies
  - id: build-maven-gradle
    file: build-maven-gradle.md
    type: primary
    focus: Detect Maven and Gradle misconfigurations including missing dependency locking, SNAPSHOT dependencies in releases, missing BOM alignment, build scan credential exposure, and absent enforcer rules
    tags:
      - maven
      - gradle
      - jvm
      - pom
      - dependency-management
      - lockfile
      - snapshot
      - bom
      - enforcer
      - wrapper
  - id: build-mix-elixir
    file: build-mix-elixir.md
    type: primary
    focus: "Detect Mix misconfigurations including missing mix.lock, git dependencies without ref pinning, missing :only for dev/test deps, and absent compilation warnings-as-errors"
    tags:
      - elixir
      - mix
      - hex
      - otp
      - erlang
      - lockfile
      - umbrella
      - dependencies
      - beam
  - id: build-npm-yarn-pnpm-bun
    file: build-npm-yarn-pnpm-bun.md
    type: primary
    focus: Detect misconfigurations in Node.js package managers including missing lockfiles, wildcard versions, unreviewed lifecycle scripts, registry misconfigurations, and production bundle bloat
    tags:
      - npm
      - yarn
      - pnpm
      - bun
      - node
      - package-manager
      - lockfile
      - lifecycle-scripts
      - registry
      - dependencies
  - id: build-nuget
    file: build-nuget.md
    type: primary
    focus: Detect NuGet misconfigurations including missing packages.lock.json, floating versions, unpinned package sources, deprecated packages, and suppressed NU analyzer warnings
    tags:
      - nuget
      - dotnet
      - csharp
      - fsharp
      - packages
      - lockfile
      - cpm
      - package-source
      - dependencies
  - id: build-pip-poetry-uv-pdm-rye
    file: build-pip-poetry-uv-pdm-rye.md
    type: primary
    focus: Detect misconfigurations in Python package managers including unpinned dependencies, missing hash verification, editable installs in production, and build isolation issues
    tags:
      - pip
      - poetry
      - uv
      - pdm
      - rye
      - python
      - package-manager
      - lockfile
      - hashes
      - virtualenv
      - dependencies
  - id: build-swiftpm-cocoapods
    file: build-swiftpm-cocoapods.md
    type: primary
    focus: Detect Swift Package Manager and CocoaPods misconfigurations including uncommitted resolution files, unpinned pod versions, missing platform requirements, and large binary dependencies
    tags:
      - swift
      - swiftpm
      - cocoapods
      - ios
      - macos
      - package-resolved
      - podfile
      - xcframework
      - dependencies
  - id: build-vendored-toolchain
    file: build-vendored-toolchain.md
    type: primary
    focus: Detect vendored dependency and toolchain issues including stale vendored code, unpinned toolchain versions, missing checksums for vendored binaries, and unattributed vendored source
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
  - id: container-image-scanning-trivy-grype-clair
    file: container-image-scanning-trivy-grype-clair.md
    type: primary
    focus: Detect gaps in container image vulnerability scanning including missing CI integration, ignored critical findings, scan-only-at-build patterns, and incomplete package coverage
    tags:
      - container
      - scanning
      - vulnerability
      - trivy
      - grype
      - clair
      - CVE
      - security
      - pipeline
      - CWE-1395
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
  - id: iac-nix
    file: iac-nix.md
    type: primary
    focus: Detect Nix and NixOS misconfigurations including unpinned flake inputs, impure derivations, missing flake checks, large closure sizes, uncached store paths in CI, missing devShell, and unfree package allowances
    tags:
      - nix
      - nixos
      - flakes
      - derivation
      - closure
      - cache
      - devshell
      - reproducibility
      - unfree
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
  - id: os-packaging-homebrew-apt-snap-flatpak-winget-appimage
    file: os-packaging-homebrew-apt-snap-flatpak-winget-appimage.md
    type: primary
    focus: "Detect OS-packaging hazards across Homebrew, Debian/apt, Snap, Flatpak, RPM, Chocolatey, winget, and AppImage -- missing checksums, weak sandboxing, hardcoded paths, unsigned artefacts, and broken uninstall cleanup"
    tags:
      - packaging
      - homebrew
      - debian
      - rpm
      - snap
      - flatpak
      - chocolatey
      - winget
      - appimage
      - msix
      - reproducible-build
      - uninstall
      - sandboxing
  - id: sec-supply-chain-sbom-slsa-sigstore
    file: sec-supply-chain-sbom-slsa-sigstore.md
    type: primary
    focus: Detect supply chain vulnerabilities including unpinned dependencies, mutable image tags, missing lock files, unsigned artifacts, absent SBOM generation, and dependency confusion risks
    tags:
      - supply-chain
      - sbom
      - slsa
      - sigstore
      - cosign
      - dependency-management
      - lock-file
      - pinning
      - provenance
      - dependency-confusion
      - CWE-829
      - CWE-494
      - CWE-1104
      - container
      - cyclonedx
      - spdx
      - syft
      - attestation
      - OCI
      - CWE-1395
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Dependencies Lockfile

**Focus:** Abandoned libraries from archived repos or with no recent commits; Abandoned packages still in dependencies; AppImage without embedded signature or zsync info; Build isolation disabled allowing host contamination

## Children

| File | Type | Focus |
|------|------|-------|
| [build-bazel-buck-pants.md](build-bazel-buck-pants.md) | 📄 primary | Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts |
| [build-bundler.md](build-bundler.md) | 📄 primary | Detect Bundler misconfigurations including missing Gemfile.lock, unpinned gem versions, git source gems without ref pinning, platform-specific gem omissions, and missing Ruby version requirements |
| [build-cargo.md](build-cargo.md) | 📄 primary | Detect Cargo misconfigurations including missing Cargo.lock in binary crates, wildcard dependencies, unsafe build scripts, missing edition declaration, and undocumented features |
| [build-composer.md](build-composer.md) | 📄 primary | Detect Composer misconfigurations including missing composer.lock, wildcard versions, scripts with shell commands, missing platform config, and dev dependencies in production autoload |
| [build-go-modules.md](build-go-modules.md) | 📄 primary | Detect Go module misconfigurations including missing go.sum, committed replace directives, missing toolchain directive, vendor directory inconsistencies, and untidied indirect dependencies |
| [build-lockfile-hygiene.md](build-lockfile-hygiene.md) | 📄 primary | Detect lockfile mismanagement across all package managers including uncommitted lockfiles, out-of-sync lockfiles, unreviewed lockfile diffs, missing integrity hashes, and improperly resolved merge conflicts |
| [build-maven-gradle.md](build-maven-gradle.md) | 📄 primary | Detect Maven and Gradle misconfigurations including missing dependency locking, SNAPSHOT dependencies in releases, missing BOM alignment, build scan credential exposure, and absent enforcer rules |
| [build-mix-elixir.md](build-mix-elixir.md) | 📄 primary | Detect Mix misconfigurations including missing mix.lock, git dependencies without ref pinning, missing :only for dev/test deps, and absent compilation warnings-as-errors |
| [build-npm-yarn-pnpm-bun.md](build-npm-yarn-pnpm-bun.md) | 📄 primary | Detect misconfigurations in Node.js package managers including missing lockfiles, wildcard versions, unreviewed lifecycle scripts, registry misconfigurations, and production bundle bloat |
| [build-nuget.md](build-nuget.md) | 📄 primary | Detect NuGet misconfigurations including missing packages.lock.json, floating versions, unpinned package sources, deprecated packages, and suppressed NU analyzer warnings |
| [build-pip-poetry-uv-pdm-rye.md](build-pip-poetry-uv-pdm-rye.md) | 📄 primary | Detect misconfigurations in Python package managers including unpinned dependencies, missing hash verification, editable installs in production, and build isolation issues |
| [build-swiftpm-cocoapods.md](build-swiftpm-cocoapods.md) | 📄 primary | Detect Swift Package Manager and CocoaPods misconfigurations including uncommitted resolution files, unpinned pod versions, missing platform requirements, and large binary dependencies |
| [build-vendored-toolchain.md](build-vendored-toolchain.md) | 📄 primary | Detect vendored dependency and toolchain issues including stale vendored code, unpinned toolchain versions, missing checksums for vendored binaries, and unattributed vendored source |
| [container-image-scanning-trivy-grype-clair.md](container-image-scanning-trivy-grype-clair.md) | 📄 primary | Detect gaps in container image vulnerability scanning including missing CI integration, ignored critical findings, scan-only-at-build patterns, and incomplete package coverage |
| [glue-dependency-supply-chain.md](glue-dependency-supply-chain.md) | 📄 primary | Lightweight gate that flags new or changed dependencies for justification, known CVEs, maintenance status, license risk, version hygiene, and unnecessary bulk |
| [iac-nix.md](iac-nix.md) | 📄 primary | Detect Nix and NixOS misconfigurations including unpinned flake inputs, impure derivations, missing flake checks, large closure sizes, uncached store paths in CI, missing devShell, and unfree package allowances |
| [licensing-compliance-copyleft-dual-license-cla.md](licensing-compliance-copyleft-dual-license-cla.md) | 📄 primary | Detect software licensing compliance gaps including missing LICENSE file, copyleft (GPL/AGPL) dependencies in proprietary products, license incompatibility between dependencies, missing attribution, absent CLA/DCO enforcement, SPDX mismatches, and missing third-party notices in distributions |
| [os-packaging-homebrew-apt-snap-flatpak-winget-appimage.md](os-packaging-homebrew-apt-snap-flatpak-winget-appimage.md) | 📄 primary | Detect OS-packaging hazards across Homebrew, Debian/apt, Snap, Flatpak, RPM, Chocolatey, winget, and AppImage -- missing checksums, weak sandboxing, hardcoded paths, unsigned artefacts, and broken uninstall cleanup |
| [sec-supply-chain-sbom-slsa-sigstore.md](sec-supply-chain-sbom-slsa-sigstore.md) | 📄 primary | Detect supply chain vulnerabilities including unpinned dependencies, mutable image tags, missing lock files, unsigned artifacts, absent SBOM generation, and dependency confusion risks |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
