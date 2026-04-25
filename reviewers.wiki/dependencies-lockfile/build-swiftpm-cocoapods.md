---
id: build-swiftpm-cocoapods
type: primary
depth_role: leaf
focus: Detect Swift Package Manager and CocoaPods misconfigurations including uncommitted resolution files, unpinned pod versions, missing platform requirements, and large binary dependencies
parents:
  - index.md
covers:
  - Package.resolved not committed to application repositories
  - Pod versions unpinned in Podfile
  - Missing platform requirements in Package.swift
  - Large binary dependencies increasing app size
  - Podfile.lock not committed
  - Git source packages without exact version pin
  - Spec repositories using HTTP
  - Deprecated pods still in dependency tree
  - "Mixed dependency managers (SPM and CocoaPods for same dependency)"
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
activation:
  file_globs:
    - Package.swift
    - Package.resolved
    - Podfile
    - Podfile.lock
    - "*.podspec"
    - "*.xcodeproj/project.pbxproj"
  keyword_matches:
    - dependencies
    - package
    - pod
    - target
    - platform
    - binaryTarget
    - xcframework
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - ios_project_change
source:
  origin: file
  path: build-swiftpm-cocoapods.md
  hash: "sha256:d51061d6caab70c1d17b69e4cdfb85f7c2ca2a91a5cfaaa3f7bcd21b741f5784"
---
# Swift Package Manager and CocoaPods

## When This Activates

Activates when diffs touch Package.swift, Package.resolved, Podfile, Podfile.lock, .podspec files, or Xcode project files. This reviewer detects Apple ecosystem dependency management issues: uncommitted resolution files allowing non-deterministic builds, unpinned versions accepting breaking changes, missing platform requirements causing build failures, large binary dependencies bloating app bundles, and unsafe dependency source configurations.

## Audit Surface

- [ ] Package.resolved missing from application repository
- [ ] Podfile.lock missing from repository
- [ ] Podfile dependency without version constraint
- [ ] Podfile dependency using >= without upper bound
- [ ] Package.swift dependency using .branch instead of .exact or .upToNextMinor
- [ ] Missing platforms declaration in Package.swift
- [ ] Binary target (XCFramework) without checksum verification
- [ ] Spec repository using http:// URL
- [ ] Pod marked deprecated on CocoaPods trunk
- [ ] Both Podfile and Package.swift managing the same dependency
- [ ] Pod installed from git without tag or commit pin
- [ ] Missing pod install --repo-update in CI
- [ ] Large binary dependency (>10MB) without justification

## Detailed Checks

### Resolution Files and Lockfile Hygiene
<!-- activation: file_globs=["Package.resolved", "Podfile.lock", ".gitignore"], keywords=["resolved", "lock", "install", "update"] -->

- [ ] **Missing Package.resolved**: flag application repositories with Package.swift but no Package.resolved committed -- without it, SPM resolves the latest matching versions on each build
- [ ] **Missing Podfile.lock**: flag repositories with Podfile but no Podfile.lock -- Podfile.lock ensures all developers and CI use identical pod versions
- [ ] **Resolution file in .gitignore**: flag .gitignore excluding Package.resolved or Podfile.lock for application targets -- these files must be committed for deterministic builds
- [ ] **Resolution file out of sync**: flag diffs where Package.swift or Podfile changes but the corresponding resolution file is not updated -- the resolution file no longer reflects the manifest
- [ ] **CI not using resolved versions**: flag CI running `swift package update` instead of `swift package resolve` -- `update` ignores the committed Package.resolved

### Version Pinning
<!-- activation: keywords=["version", ".exact", ".upToNextMinor", ".upToNextMajor", ".branch", ".revision", "~>", ">=", "pod "] -->

- [ ] **Branch-based SPM dependency**: flag `.package(url: ..., branch: "main")` -- branches are mutable; use `.exact("1.2.3")` or `.upToNextMinor(from: "1.2.0")` for reproducibility
- [ ] **Unpinned pod version**: flag `pod 'Alamofire'` without any version constraint -- accepts any version including major upgrades with breaking changes
- [ ] **Open-ended pod constraint**: flag `pod 'Alamofire', '>= 5.0'` without upper bound -- allows arbitrary major version jumps
- [ ] **Missing pessimistic constraint**: flag pods using `>=` instead of `~>` (optimistic operator) -- `~> 5.4` allows 5.x but not 6.0
- [ ] **Git pod without tag or commit**: flag `pod 'Foo', :git => '...'` without `:tag` or `:commit` -- resolves to HEAD of default branch, which changes between installs

### Platform Requirements and Binary Targets
<!-- activation: keywords=["platforms", "iOS", "macOS", "tvOS", "watchOS", "visionOS", "binaryTarget", "xcframework", "checksum", "url"] -->

- [ ] **Missing platforms declaration**: flag Package.swift without explicit `platforms: [.iOS(.v15), ...]` -- consumers cannot determine minimum deployment target, causing unexpected build failures
- [ ] **Binary target without checksum**: flag `.binaryTarget(name:, url:, checksum:)` with missing or placeholder checksum -- the downloaded binary cannot be integrity-verified
- [ ] **Large binary dependency**: flag XCFramework binary targets larger than 10MB without documentation justifying the size -- large binaries increase app download size and may violate App Store size recommendations
- [ ] **HTTP binary target URL**: flag binaryTarget URLs using `http://` -- binary downloads over plaintext are subject to MITM; use `https://`

### Dependency Manager Consistency
<!-- activation: keywords=["Podfile", "Package.swift", "SPM", "CocoaPods", "pod", "package", "deprecated"] -->

- [ ] **Mixed managers for same dependency**: flag the same library appearing in both Podfile and Package.swift -- dual management causes version conflicts and increases build complexity
- [ ] **Deprecated pod**: flag pods marked deprecated on CocoaPods trunk -- migrate to the suggested replacement or SPM equivalent
- [ ] **HTTP spec repository**: flag `source 'http://...'` in Podfile -- spec repository communication should use HTTPS
- [ ] **Missing pod repo update in CI**: flag CI running `pod install` without `--repo-update` when using custom spec repositories -- stale spec repos may resolve outdated versions

## Common False Positives

- **Library packages omitting Package.resolved**: Swift package libraries conventionally do not commit Package.resolved so consumers resolve compatible versions. Flag only for applications.
- **Branch-based dependency during development**: `.branch("feature-x")` is common during active feature development. Flag only on main/release branches.
- **Large binary for vendor SDK**: some vendor SDKs (Firebase, AWS) are inherently large. Verify the binary is from a trusted vendor before flagging size alone.
- **Both SPM and CocoaPods in migration**: projects migrating from CocoaPods to SPM may temporarily have both. Flag only when migration has stalled and no tracking issue exists.

## Severity Guidance

| Finding | Severity |
|---|---|
| Binary target with HTTP URL or missing checksum | Critical |
| Package.resolved missing from application repository | Important |
| Podfile.lock missing from repository | Important |
| Branch-based SPM dependency on main branch | Important |
| Unpinned pod version in production | Important |
| HTTP spec repository URL | Important |
| Mixed dependency managers for same library | Minor |
| Missing platforms declaration in Package.swift | Minor |
| Large binary dependency without justification | Minor |
| Deprecated pod without migration plan | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in Swift/ObjC dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for distributed binaries

## Authoritative References

- [Swift Package Manager Documentation](https://www.swift.org/documentation/package-manager/)
- [Apple: Adding Package Dependencies](https://developer.apple.com/documentation/xcode/adding-package-dependencies-to-your-app)
- [CocoaPods Guides: Using CocoaPods](https://guides.cocoapods.org/using/using-cocoapods.html)
- [CocoaPods: Podfile Syntax](https://guides.cocoapods.org/syntax/podfile.html)
