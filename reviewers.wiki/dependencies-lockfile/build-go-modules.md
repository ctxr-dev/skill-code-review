---
id: build-go-modules
type: primary
depth_role: leaf
focus: Detect Go module misconfigurations including missing go.sum, committed replace directives, missing toolchain directive, vendor directory inconsistencies, and untidied indirect dependencies
parents:
  - index.md
covers:
  - Missing go.sum file in application repositories
  - Replace directives in go.mod committed to main branch
  - Missing toolchain directive for Go version management
  - "vendor/ directory not committed when module expects it"
  - Indirect dependencies not tidied with go mod tidy
  - Go modules using deprecated or retracted versions
  - GONOSUMCHECK or GONOSUMDB disabling checksum verification
  - Module path not matching repository URL
  - Private module imports without GOPRIVATE configuration
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
activation:
  file_globs:
    - go.mod
    - go.sum
    - "vendor/modules.txt"
    - .go-version
  keyword_matches:
    - require
    - replace
    - retract
    - toolchain
    - go mod
    - go get
    - vendor
    - GOPRIVATE
    - GONOSUMCHECK
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - vendor_directory_change
source:
  origin: file
  path: build-go-modules.md
  hash: "sha256:5a6dffb631b9a28ca498f94689f65181db4c3d0dc6bce4e114d46df4641b2cdf"
---
# Go Modules

## When This Activates

Activates when diffs touch go.mod, go.sum, vendor/modules.txt, or .go-version. This reviewer detects Go module misconfigurations: missing go.sum files that disable checksum verification, replace directives that break reproducibility, missing toolchain directives causing inconsistent Go versions, vendor directory inconsistencies, and indirect dependencies that have not been tidied. Go's module system provides strong integrity guarantees through the checksum database (sum.golang.org), but these protections are voided by misconfigurations.

## Audit Surface

- [ ] go.sum missing from repository
- [ ] go.mod contains replace directive pointing to local path
- [ ] go.mod contains replace directive pointing to git branch
- [ ] go.mod missing toolchain directive (Go 1.21+)
- [ ] vendor/ directory committed but go.mod lacks -mod=vendor expectation
- [ ] vendor/ directory absent when go.mod or CI uses -mod=vendor
- [ ] go.mod indirect dependencies not tidied (stale entries)
- [ ] go.mod uses retracted or deprecated module version
- [ ] GONOSUMCHECK or GONOSUMDB set in CI environment
- [ ] GOPRIVATE not configured for internal module paths
- [ ] Go module path does not match repository hosting URL
- [ ] go.mod minimum Go version significantly behind latest stable
- [ ] Missing go vet or staticcheck in CI pipeline
- [ ] CGO_ENABLED=1 in production container without explicit justification

## Detailed Checks

### go.sum and Checksum Verification
<!-- activation: file_globs=["go.sum", "go.mod", ".gitignore"], keywords=["go.sum", "GONOSUMCHECK", "GONOSUMDB", "GOFLAGS", "checksum", "sum.golang.org"] -->

- [ ] **Missing go.sum**: flag repositories with go.mod but no go.sum -- go.sum contains cryptographic checksums for all dependencies; without it, `go build` cannot verify module integrity
- [ ] **go.sum in .gitignore**: flag .gitignore entries excluding go.sum -- go.sum must be committed to enable checksum verification across all environments
- [ ] **GONOSUMCHECK in CI**: flag CI environment variables setting `GONOSUMCHECK` -- disables checksum verification against the Go checksum database, allowing tampered modules
- [ ] **GONOSUMDB in CI**: flag `GONOSUMDB` set broadly (not scoped to private modules) -- prevents the checksum database from verifying public modules
- [ ] **GOFLAGS=-insecure**: flag insecure download flags in CI or build scripts -- bypasses TLS verification for module downloads

### Replace Directives
<!-- activation: keywords=["replace", "=>", "path", "local", "fork"] -->

- [ ] **Local path replace**: flag `replace module => ../local-path` in go.mod committed to main branch -- local path replacements break builds for anyone without the same filesystem layout
- [ ] **Git branch replace**: flag replace directives pointing to a branch (`@main`, `@master`) instead of a tagged version or commit -- the resolved code changes between builds
- [ ] **Replace without tracking issue**: flag replace directives without a comment linking to an issue tracking their removal -- replacements should be temporary workarounds, not permanent fixtures
- [ ] **Replace overriding security fix**: flag replace directives that pin a module to a version older than one with a known vulnerability fix -- may suppress security patches

### Toolchain and Go Version
<!-- activation: keywords=["toolchain", "go 1.", "go version", ".go-version", "GOTOOLCHAIN"] -->

- [ ] **Missing toolchain directive**: flag go.mod without a `toolchain` directive (required since Go 1.21) -- without it, the Go version used depends on the developer's local installation, causing inconsistent builds
- [ ] **Go version significantly behind**: flag go.mod specifying a Go version more than two minor releases behind the latest stable -- older Go versions miss security fixes and performance improvements
- [ ] **GOTOOLCHAIN=auto without bounds**: flag CI using `GOTOOLCHAIN=auto` without verifying the resolved version -- auto-downloading arbitrary toolchain versions in CI reduces reproducibility

### Vendor Directory
<!-- activation: file_globs=["vendor/modules.txt", "vendor/**"], keywords=["vendor", "-mod=vendor", "goflags"] -->

- [ ] **Vendor expected but missing**: flag projects where CI or Makefile uses `-mod=vendor` but no vendor/ directory is committed -- the build will fail or silently fall back to network fetching
- [ ] **Vendor committed but not used**: flag vendor/ directory committed but no `-mod=vendor` flag in build commands -- the vendor directory is dead weight and may become stale
- [ ] **Vendor out of sync**: flag changes to go.mod or go.sum without corresponding changes to vendor/modules.txt -- run `go mod vendor` after dependency changes to keep vendor in sync
- [ ] **Vendor without checksum verification**: flag vendor/ usage without `go mod verify` in CI -- vendor directories can be manually modified; `go mod verify` ensures they match go.sum

### Dependency Hygiene
<!-- activation: keywords=["indirect", "tidy", "retract", "deprecated", "GOPRIVATE", "module path"] -->

- [ ] **Untidied indirect deps**: flag go.mod with stale `// indirect` entries that `go mod tidy` would remove -- stale entries confuse dependency analysis and may reference unused modules
- [ ] **Retracted version in use**: flag go.mod requiring a module version that has been retracted by the module author -- retracted versions typically have critical bugs
- [ ] **Missing GOPRIVATE for internal modules**: flag imports of internal module paths (e.g., `company.com/internal/...`) without GOPRIVATE configuration -- Go will attempt to fetch these from the public proxy, leaking private module names
- [ ] **Module path mismatch**: flag go.mod `module` declaration that does not match the repository URL -- vanity import paths must have a working redirect; mismatches cause `go get` failures

## Common False Positives

- **Replace directives in development branches**: replace directives are common during development to test local changes. Flag only on main/release branches or when no tracking issue is referenced.
- **Library modules omitting vendor/**: libraries typically do not vendor dependencies; consumers resolve their own dependency graph. Flag vendor-related issues only for applications and services.
- **GOPRIVATE for internal modules**: setting GOPRIVATE is correct behavior for private modules. Flag only when GONOSUMCHECK or GONOSUMDB is set too broadly.
- **Old Go version in go.mod for compatibility**: some modules intentionally support older Go versions for broad compatibility. Verify MSRV policy before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| GONOSUMCHECK disabling checksum verification in CI | Critical |
| Missing go.sum from repository | Critical |
| Replace directive pointing to local path on main branch | Important |
| Replace directive overriding a security fix | Important |
| Missing GOPRIVATE leaking internal module names | Important |
| Retracted module version in go.mod | Important |
| Vendor directory out of sync with go.mod | Important |
| Missing toolchain directive in go.mod | Minor |
| Untidied indirect dependencies | Minor |
| Go version two+ minor releases behind stable | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in Go module dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for Go binaries
- `build-vendored-toolchain` -- vendored dependency and toolchain management

## Authoritative References

- [Go Modules Reference](https://go.dev/ref/mod)
- [Go Checksum Database](https://sum.golang.org/)
- [Go Vulnerability Database](https://vuln.go.dev/)
- [govulncheck Documentation](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
- [Go Blog: Module Retraction](https://go.dev/blog/module-retraction)
- [Go Blog: Toolchain Management in Go 1.21](https://go.dev/blog/toolchain)
