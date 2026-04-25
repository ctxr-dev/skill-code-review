---
id: build-nuget
type: primary
depth_role: leaf
focus: Detect NuGet misconfigurations including missing packages.lock.json, floating versions, unpinned package sources, deprecated packages, and suppressed NU analyzer warnings
parents:
  - index.md
covers:
  - Missing packages.lock.json when RestorePackagesWithLockFile is enabled
  - Floating version ranges allowing arbitrary resolution
  - Package source not pinned in nuget.config
  - Deprecated or vulnerable packages in dependency tree
  - NU analyzer warnings suppressed with NoWarn
  - PackageReference without version attribute
  - Unsigned packages consumed from untrusted feeds
  - "Central Package Management (CPM) not used in multi-project solutions"
  - Global packages cache path committed to repository
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
activation:
  file_globs:
    - "*.csproj"
    - "*.fsproj"
    - "*.vbproj"
    - nuget.config
    - Directory.Packages.props
    - Directory.Build.props
    - packages.lock.json
    - "*.sln"
  keyword_matches:
    - PackageReference
    - PackageVersion
    - RestorePackagesWithLockFile
    - NuGet
    - nuget
    - packageSources
    - NoWarn
    - NU1
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - dotnet_project_change
source:
  origin: file
  path: build-nuget.md
  hash: "sha256:75d7e29ff948ab250baceeda49f0bc45a7164578021ea0e097299dffab2a13a2"
---
# NuGet (.NET Package Manager)

## When This Activates

Activates when diffs touch .csproj, .fsproj, .vbproj, nuget.config, Directory.Packages.props, Directory.Build.props, or packages.lock.json files. This reviewer detects .NET NuGet misconfigurations: missing lock files allowing non-deterministic restores, floating version ranges, unpinned package sources enabling feed substitution, deprecated packages with known vulnerabilities, and suppressed NU analyzer warnings that hide dependency problems.

## Audit Surface

- [ ] packages.lock.json missing when lock file mode is enabled
- [ ] PackageReference using floating version (* or range syntax)
- [ ] PackageReference without explicit Version attribute
- [ ] nuget.config missing or not pinning package sources
- [ ] nuget.config with http:// feed URL
- [ ] Package with known vulnerability in NuGet advisory database
- [ ] Package marked deprecated on nuget.org still referenced
- [ ] NoWarn suppressing NU1701, NU1603, or other dependency warnings
- [ ] Missing Directory.Packages.props for Central Package Management
- [ ] packages/ folder or global-packages path committed to repository
- [ ] PrivateAssets=all missing on dev-only package references
- [ ] Package source credentials in nuget.config committed to repository
- [ ] Missing RestorePackagesWithLockFile property

## Detailed Checks

### Lock File and Restore Determinism
<!-- activation: file_globs=["*.csproj", "packages.lock.json", "Directory.Build.props"], keywords=["RestorePackagesWithLockFile", "RestoreLockedMode", "lock", "restore", "packages.lock"] -->

- [ ] **Missing lock file enablement**: flag solutions without `<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>` in Directory.Build.props -- NuGet does not generate lock files by default; without them, restores are non-deterministic
- [ ] **Lock file not committed**: flag .gitignore excluding packages.lock.json -- lock files must be committed when lock file mode is enabled
- [ ] **CI not using locked restore**: flag CI scripts running `dotnet restore` without `--locked-mode` when lock files are committed -- locked mode ensures the restore exactly matches the lock file
- [ ] **Lock file out of sync**: flag diffs where .csproj PackageReferences change but packages.lock.json is not regenerated -- the lock file no longer reflects the project

### Version Pinning and Ranges
<!-- activation: keywords=["PackageReference", "Version", "*", "Include", "range", "floating"] -->

- [ ] **Floating version**: flag `<PackageReference Include="Foo" Version="*" />` or range syntax `[1.0,)` -- accepts any version matching the range, defeating reproducibility
- [ ] **Missing Version attribute**: flag `<PackageReference Include="Foo" />` without a Version attribute and without Central Package Management -- the resolved version depends on the NuGet cache or feed state
- [ ] **Pre-release in production**: flag PackageReferences with `-alpha`, `-beta`, `-rc`, or `-preview` suffixes on release branches -- pre-release packages may have breaking changes or bugs

### Package Sources and Feed Security
<!-- activation: file_globs=["nuget.config"], keywords=["packageSources", "add", "http://", "https://", "credentials", "apikeys", "source"] -->

- [ ] **Missing nuget.config**: flag solutions without nuget.config when using private NuGet feeds -- without explicit source configuration, NuGet resolves from all configured machine-level feeds, enabling feed substitution
- [ ] **HTTP feed URL**: flag `<add key="..." value="http://..." />` in nuget.config -- package downloads over plaintext are subject to MITM attacks
- [ ] **Credentials in nuget.config**: flag `<packageSourceCredentials>` with `<ClearTextPassword>` committed to the repository -- use NuGet credential providers or CI environment variables
- [ ] **Unsigned packages from untrusted feeds**: flag `<trustedSigners>` section missing when consuming packages from third-party feeds -- package signature verification prevents tampered packages

### Central Package Management and Governance
<!-- activation: file_globs=["Directory.Packages.props", "*.csproj"], keywords=["PackageVersion", "ManagePackageVersionsCentrally", "VersionOverride", "NoWarn"] -->

- [ ] **Missing CPM in multi-project solution**: flag solutions with 3+ projects without Directory.Packages.props and `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>` -- without CPM, different projects may reference different versions of the same package
- [ ] **VersionOverride without justification**: flag `VersionOverride` in .csproj files without a comment explaining why -- overrides defeat the purpose of central version management
- [ ] **Suppressed NU warnings**: flag `<NoWarn>` entries suppressing NU1701 (compatibility), NU1603 (version fallback), or NU1605 (downgrade) -- these warnings indicate real dependency resolution problems
- [ ] **Deprecated package**: flag PackageReferences for packages marked as deprecated on nuget.org -- migrate to the recommended replacement
- [ ] **Missing PrivateAssets on dev packages**: flag test/build tool packages (coverlet, xunit.runner, analyzers) without `PrivateAssets="all"` -- these should not flow to consuming projects

## Common False Positives

- **Library projects without lock files**: .NET libraries published as NuGet packages may reasonably omit lock files. Flag only for deployable applications and services.
- **Floating versions in test projects**: test projects that always want the latest test framework version may use floating versions intentionally. Flag only for production-deployed projects.
- **VersionOverride for security patches**: some projects override CPM versions to pull in urgent security fixes before the central version is updated. Verify the override references a newer, not older, version.
- **NoWarn for known-safe compatibility**: NU1701 is commonly suppressed for .NET Standard compatibility with .NET Framework packages that are known to work. Verify the suppression is documented.

## Severity Guidance

| Finding | Severity |
|---|---|
| nuget.config with ClearTextPassword committed | Critical |
| HTTP feed URL in nuget.config | Critical |
| Floating version (*) in production PackageReference | Important |
| Missing nuget.config with private feed dependencies | Important |
| CI using dotnet restore without --locked-mode | Important |
| Deprecated package with known vulnerability | Important |
| Suppressed NU1605 (dependency downgrade) warning | Important |
| Missing Central Package Management in large solution | Minor |
| Missing PrivateAssets on analyzer package | Minor |
| Pre-release package on release branch | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in NuGet dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for published NuGet packages

## Authoritative References

- [NuGet Lock File](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#locking-dependencies)
- [NuGet Central Package Management](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management)
- [NuGet Package Signing](https://learn.microsoft.com/en-us/nuget/reference/signed-packages-reference)
- [NuGet Security Advisories](https://github.com/advisories?query=ecosystem%3Anuget)
- [dotnet list package --vulnerable](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-list-package)
