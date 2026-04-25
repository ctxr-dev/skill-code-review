---
id: glue-dependency-supply-chain
type: primary
depth_role: leaf
focus: Lightweight gate that flags new or changed dependencies for justification, known CVEs, maintenance status, license risk, version hygiene, and unnecessary bulk
parents:
  - index.md
covers:
  - New dependency added without justification in PR description
  - Dependency with known CVE in advisory databases
  - "Dependency not actively maintained (no commits in 12+ months)"
  - Dependency with overly permissive or copyleft license
  - Missing lock file update when manifest changes
  - Wildcard or unpinned version range in dependency specifier
  - "Large dependency pulled in for a small feature (sledgehammer dependency)"
  - Duplicate dependencies with overlapping functionality
  - Dependency adding excessive transitive weight
  - Dependency sourced from non-default or untrusted registry
  - Dependencies with known CVEs referenced in advisories
  - Unpinned dependency versions using wildcard or floating ranges
  - Dependencies not updated in 12+ months based on lock file metadata
  - Abandoned libraries from archived repos or with no recent commits
  - Dependencies pulled from untrusted or custom registries
  - Lock files not committed to version control
  - Transitive dependency vulnerabilities hidden behind direct dependencies
  - Dev dependencies leaking into production bundles
  - "Dependency confusion attacks via private/public name collisions"
  - Pinned dependencies using tags instead of hashes or digests
  - Vendored copies of libraries with known vulnerabilities
  - Missing automated dependency audit in CI pipeline
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
aliases:
  - sec-owasp-a06-vulnerable-components
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
source:
  origin: file
  path: glue-dependency-supply-chain.md
  hash: "sha256:1237066204b68b6f64538916a7172c51f9255af139ab2e3e1d90c5ce832db18f"
---
# Dependency and Supply Chain Gate

## When This Activates

Always loaded as a lightweight gate. Every diff is scanned for new or changed dependencies in any ecosystem. Adding a dependency is a long-term commitment: it increases attack surface, adds maintenance burden, and introduces transitive risk. This reviewer ensures every new dependency is justified, actively maintained, free of known critical vulnerabilities, appropriately licensed, and version-pinned. It delegates deep supply-chain analysis to specialist reviewers but catches the high-signal issues that should block any PR.

## Audit Surface

- [ ] New direct dependency added -- PR description does not explain why
- [ ] Dependency has open CVE with CVSS >= 7.0 in OSV or NVD
- [ ] Dependency repository archived or no commits in 12+ months
- [ ] Dependency license is AGPL, SSPL, or other copyleft incompatible with project
- [ ] Manifest changed but lock file not regenerated
- [ ] Version range uses *, >=, or latest instead of pinned version
- [ ] New dependency duplicates functionality of an existing dependency
- [ ] New dependency adds 50+ transitive dependencies for a narrow use case
- [ ] Dependency fetched from git URL with mutable ref (branch, HEAD)
- [ ] Dependency with fewer than 100 GitHub stars or unknown provenance
- [ ] Multiple dependencies solving the same problem (e.g., two HTTP clients)

## Detailed Checks

### Justification and Necessity
<!-- activation: keywords=["dependencies", "devDependencies", "require", "import", "add", "install", "gem", "crate", "module", "package"] -->

- [ ] **No justification for new dependency**: flag any newly added direct dependency where the PR description does not explain why the dependency is needed and why the functionality cannot be achieved with existing dependencies or standard library -- every new dependency should pass a "do we really need this?" test
- [ ] **Sledgehammer dependency**: flag a large dependency (measured by transitive tree size, download size, or scope) added for a narrow feature -- pulling in `lodash` for a single `debounce`, `moment` for date formatting, or `aws-sdk` (v2, full) for one S3 call. Prefer smaller focused packages or standard library equivalents
- [ ] **Duplicate functionality**: flag a new dependency that overlaps significantly with an existing dependency in the project -- two HTTP clients (axios + got), two date libraries (moment + date-fns), two validation libraries (joi + yup). The team should standardize on one
- [ ] **Dependency replacing standard library**: flag a dependency that wraps a standard library feature with minimal added value -- `is-odd`, `is-number`, `left-pad` are canonical examples. Verify the dependency provides meaningful functionality beyond what the language ships

### Vulnerability and Maintenance Status
<!-- activation: keywords=["CVE", "advisory", "vulnerability", "audit", "deprecated", "archived", "unmaintained", "abandon", "stale"] -->

- [ ] **Known CVE**: flag any dependency (direct or first-level transitive) with an open CVE at CVSS >= 7.0 -- the team must either update to a patched version, find an alternative, or document an explicit risk acceptance with a mitigating control
- [ ] **Unmaintained dependency**: flag a dependency whose source repository has no commits in 12+ months, is archived on GitHub, or has an explicit deprecation notice -- unmaintained dependencies will not receive security patches
- [ ] **Low adoption or unknown provenance**: flag a newly added dependency with fewer than 100 GitHub stars, fewer than 1000 weekly downloads, or no identifiable maintainer -- low-adoption packages are higher risk for supply chain compromise (typosquatting, account takeover)
- [ ] **Deprecated with recommended replacement**: flag dependencies that publish a deprecation notice pointing to a successor -- using a deprecated package accumulates tech debt and may expose the project to unpatched vulnerabilities

### Version Pinning and Lock File Sync
<!-- activation: keywords=["version", "*", "^", "~", ">=", "latest", "lock", "lockfile", "package-lock", "yarn.lock", "Cargo.lock", "go.sum", "poetry.lock", "Gemfile.lock"] -->

- [ ] **Wildcard or unbounded version**: flag version specifiers using `*`, `>=X.Y.Z` without upper bound, or `latest` in any manifest -- these allow arbitrary version resolution including versions with known vulnerabilities
- [ ] **Lock file not updated**: flag diffs where the manifest (package.json, Cargo.toml, pyproject.toml, Gemfile, go.mod) adds or changes a dependency but the lock file is unchanged -- the lock file no longer reflects the declared constraints
- [ ] **Git dependency with mutable ref**: flag dependencies sourced from git URLs pinned to a branch name (`@main`, `@master`) or tag instead of a full commit SHA -- mutable refs allow silent code changes between installs
- [ ] **Pre-1.0 dependency with caret range**: flag `^0.x.y` ranges where caret allows minor version bumps that may include breaking changes per semver convention for 0.x releases

### License Compatibility
<!-- activation: keywords=["license", "LICENSE", "MIT", "Apache", "GPL", "AGPL", "SSPL", "BSL", "BUSL", "LGPL", "MPL", "ISC", "BSD", "copyleft", "proprietary"] -->

- [ ] **Copyleft license incompatibility**: flag dependencies licensed under AGPL-3.0, GPL-3.0, SSPL, or EUPL when the project itself is under a permissive or proprietary license -- copyleft obligations may require releasing the project's source code
- [ ] **License change on update**: flag a dependency version update that changes the license (e.g., from MIT to BSL, from Apache-2.0 to SSPL) -- license changes on previously permissive packages require legal review
- [ ] **No license declared**: flag a dependency with no LICENSE file or license field in its manifest -- using unlicensed code is a legal risk; all rights are reserved by default
- [ ] **Dual licensing with commercial restriction**: flag dependencies with dual licensing (e.g., GPL + commercial) where the project may not qualify for the permissive option -- verify which license applies

## Common False Positives

- **Framework-mandated dependencies**: adding a database driver, ORM adapter, or framework plugin that is required by the chosen framework is inherently justified. Verify it is the canonical choice for the framework.
- **Monorepo internal packages**: in monorepos, adding an internal workspace package is not an external dependency. Flag only packages from external registries.
- **Automated dependency update PRs**: Dependabot and Renovate PRs add version bumps as their purpose. Verify the update is from a trusted bot and the new version resolves a known issue.
- **Caret ranges on stable packages**: `^1.2.3` in package.json is standard npm convention for stable packages. Flag only `^0.x.y` or ecosystems where caret is not the norm.
- **Test-only dependencies**: dev/test dependencies carry lower risk than production dependencies. Still flag CVEs and license issues, but justification requirements are lighter.

## Severity Guidance

| Finding | Severity |
|---|---|
| Dependency with critical CVE (CVSS >= 9.0) in production path | Critical |
| Dependency license incompatible with project (copyleft in proprietary) | Critical |
| Dependency with high CVE (CVSS >= 7.0) in production path | Important |
| New dependency with no justification in PR description | Important |
| Manifest changed but lock file not regenerated | Important |
| Wildcard or unbounded version range in production manifest | Important |
| Dependency archived or unmaintained (no commits 12+ months) | Important |
| Sledgehammer dependency for narrow use case | Minor |
| Duplicate functionality with existing dependency | Minor |
| Pre-1.0 dependency with caret range | Minor |
| Low-adoption dependency (under 100 stars) | Minor |

## See Also

- `sec-owasp-a06-vulnerable-components` -- deep CVE analysis, transitive vulnerability scanning, and SCA tool integration
- `sec-supply-chain-sbom-slsa-sigstore` -- artifact signing, SBOM generation, provenance attestation, and dependency confusion
- `build-lockfile-hygiene` -- detailed lock file integrity, merge conflict detection, and CI frozen install enforcement
- `sec-secrets-management-and-rotation` -- dependencies that bundle credentials or require API keys at install time

## Authoritative References

- [OWASP Top 10:2021 -- A06 Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)
- [OpenSSF Scorecard: Dependency Evaluation](https://securityscorecards.dev/)
- [SPDX License List](https://spdx.org/licenses/)
- [OSV.dev -- Open Source Vulnerability Database](https://osv.dev/)
- [Tidelift: Choosing Well-Maintained Dependencies](https://tidelift.com/about-lifters)
