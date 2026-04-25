---
id: build-lockfile-hygiene
type: primary
depth_role: leaf
focus: Detect lockfile mismanagement across all package managers including uncommitted lockfiles, out-of-sync lockfiles, unreviewed lockfile diffs, missing integrity hashes, and improperly resolved merge conflicts
parents:
  - index.md
covers:
  - Lockfile not committed to version control
  - Lockfile out of sync with manifest file
  - Lockfile diffs not reviewed for unexpected changes
  - Integrity hashes missing from lockfile entries
  - Lockfile merge conflicts not resolved by regeneration
  - Lockfile excluded by .gitignore for application repositories
  - Manual lockfile edits instead of using package manager commands
  - "CI not using frozen/locked install mode"
  - Multiple lockfile formats in same repository
  - Lockfile format downgrade losing integrity information
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
activation:
  file_globs:
    - package-lock.json
    - yarn.lock
    - pnpm-lock.yaml
    - bun.lockb
    - Pipfile.lock
    - poetry.lock
    - pdm.lock
    - uv.lock
    - Cargo.lock
    - go.sum
    - Gemfile.lock
    - composer.lock
    - packages.lock.json
    - Package.resolved
    - Podfile.lock
    - mix.lock
    - gradle.lockfile
    - .gitignore
  keyword_matches:
    - lock
    - lockfile
    - frozen
    - integrity
    - hash
    - resolved
    - sha512
    - sha256
    - checksum
  structural_signals:
    - lock_file_change
    - lock_file_missing
    - manifest_without_lock_change
source:
  origin: file
  path: build-lockfile-hygiene.md
  hash: "sha256:1416ed2a9bd0113ecfc4ae66969704c2c200faee880fcaa05424e3bf292ec223"
---
# Lockfile Hygiene (Cross-Ecosystem)

## When This Activates

Activates when diffs touch any package manager lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml, Cargo.lock, go.sum, Gemfile.lock, poetry.lock, composer.lock, Podfile.lock, mix.lock, gradle.lockfile, packages.lock.json, Package.resolved), or when .gitignore changes affect lockfile visibility. This is a cross-ecosystem reviewer that enforces lockfile best practices regardless of the specific package manager: lockfiles must be committed, kept in sync with manifests, include integrity hashes, and be properly regenerated (not manually edited or merge-conflicted).

## Audit Surface

- [ ] Lockfile missing for package manager that supports one
- [ ] Lockfile listed in .gitignore for application repository
- [ ] Manifest file changed but lockfile not regenerated
- [ ] Lockfile changed but manifest file unchanged (suspicious)
- [ ] Lockfile entries missing integrity/hash fields
- [ ] Lockfile integrity hash using weak algorithm (sha1)
- [ ] Lockfile with merge conflict markers (<<<, ===, >>>)
- [ ] Lockfile manually edited (non-tool-generated changes)
- [ ] CI install command not using frozen/locked mode
- [ ] Multiple lockfile types in same repository
- [ ] Lockfile format version downgrade
- [ ] Lockfile diff adding 50+ transitive dependencies (unusual)
- [ ] Lockfile removing integrity hashes that were previously present
- [ ] Registry URL changed in lockfile entries

## Detailed Checks

### Lockfile Presence and Commitment
<!-- activation: file_globs=[".gitignore", "package.json", "Cargo.toml", "go.mod", "Gemfile", "pyproject.toml", "composer.json", "*.csproj", "Package.swift", "mix.exs", "build.gradle"], keywords=["lock", "gitignore", "ignore"] -->

- [ ] **Missing lockfile**: flag application repositories with a package manager manifest but no corresponding lockfile -- see ecosystem-specific lockfile expectations: package-lock.json (npm), yarn.lock (Yarn), pnpm-lock.yaml (pnpm), Cargo.lock (Rust binary crates), go.sum (Go), Gemfile.lock (Ruby), poetry.lock (Poetry), composer.lock (Composer)
- [ ] **Lockfile in .gitignore**: flag .gitignore entries excluding lockfiles for application (not library) repositories -- lockfiles must be committed to ensure all environments use identical dependency versions
- [ ] **Multiple lockfile types**: flag repositories containing multiple lockfile types for the same ecosystem (e.g., both package-lock.json and yarn.lock) -- teams must standardize on one package manager to avoid conflicting resolutions
- [ ] **Lockfile for library exception**: note that libraries in some ecosystems (npm, Python, Ruby) conventionally omit lockfiles -- this reviewer should not flag missing lockfiles in packages clearly marked as publishable libraries

### Lockfile Sync with Manifest
<!-- activation: keywords=["dependencies", "require", "add", "remove", "update", "version", "upgrade"] -->

- [ ] **Manifest changed, lockfile unchanged**: flag diffs where the manifest adds, removes, or changes dependency versions but the lockfile is not regenerated -- the lockfile no longer reflects the declared constraints, and the next install may resolve differently than expected
- [ ] **Lockfile changed, manifest unchanged**: flag lockfile-only changes with no corresponding manifest edit -- this may indicate manual lockfile tampering, a CI bot update, or a lock regeneration without dependency changes. Verify the change is intentional
- [ ] **Lockfile format downgrade**: flag lockfile changes that switch to an older format version (e.g., package-lock.json lockfileVersion 3 to 2) -- older formats may lack integrity fields or support for newer features

### Integrity Hashes
<!-- activation: keywords=["integrity", "sha512", "sha256", "sha1", "hash", "checksum", "resolved"] -->

- [ ] **Missing integrity hashes**: flag lockfile entries without integrity/hash fields (e.g., package-lock.json entries missing `integrity`, go.sum entries missing hash lines) -- integrity hashes prevent package substitution attacks
- [ ] **Weak hash algorithm**: flag lockfile entries using sha1 instead of sha256 or sha512 -- sha1 is vulnerable to collision attacks and should not be trusted for integrity verification
- [ ] **Integrity hashes removed**: flag diffs that remove previously existing integrity hashes from lockfile entries -- this may indicate tampering or a lockfile regeneration with a misconfigured tool
- [ ] **Registry URL changed**: flag lockfile entries where the `resolved` or registry URL has changed from the expected registry -- may indicate a dependency confusion attempt or misconfigured registry

### Merge Conflicts and Manual Edits
<!-- activation: keywords=["merge", "conflict", "<<<", "===", ">>>", "manual", "edit"] -->

- [ ] **Merge conflict markers**: flag lockfile content containing `<<<<<<<`, `=======`, or `>>>>>>>` -- lockfile merge conflicts must be resolved by regenerating the lockfile (`npm ci`, `bundle install`, `cargo generate-lockfile`), not by manually editing the conflict markers
- [ ] **Manual lockfile edits**: flag lockfile changes that appear hand-edited (single line changes, version bumps without corresponding hash changes) -- lockfiles should only be modified by package manager commands; manual edits can create inconsistencies
- [ ] **Lockfile with invalid structure**: flag lockfile changes that produce invalid JSON/YAML/TOML -- typically caused by bad merge conflict resolution

### CI Frozen Install Enforcement
<!-- activation: keywords=["ci", "install", "frozen", "locked", "deployment", "npm ci", "bundle install --frozen", "pip install --require-hashes"] -->

- [ ] **CI not using frozen install**: flag CI scripts using `npm install` instead of `npm ci`, `bundle install` instead of `bundle install --frozen-lockfile`, `composer install` without `--no-interaction`, or equivalent -- unfrozen installs can modify the lockfile during CI, masking sync issues
- [ ] **Production deploy without lockfile verification**: flag Dockerfile or deploy scripts that install dependencies without lockfile enforcement -- production installs must exactly match the committed lockfile
- [ ] **Unusual transitive dependency growth**: flag lockfile diffs adding 50+ new transitive dependencies from a single direct dependency change -- may indicate a dependency with an unexpectedly large tree or a dependency confusion attack pulling from the wrong registry

## Common False Positives

- **Library packages omitting lockfiles**: npm libraries, Python libraries, and Ruby gems conventionally do not commit lockfiles so consumers resolve compatible versions. This reviewer recognizes the library exception.
- **Automated dependency update PRs**: Dependabot, Renovate, and similar tools produce lockfile-only changes as their normal operation. Verify the change is from a trusted automation before flagging "lockfile changed without manifest change."
- **Lockfile churn from tooling upgrades**: upgrading the package manager version may reformat the lockfile without changing resolved versions. Verify the content is functionally identical.
- **go.sum growth on new dependency**: go.sum grows by design when new modules are added; each module adds two hash lines. Flag only when go.sum changes without go.mod changes.

## Severity Guidance

| Finding | Severity |
|---|---|
| Lockfile with unresolved merge conflict markers | Critical |
| Missing lockfile for production application | Critical |
| Lockfile integrity hashes removed (potential tampering) | Critical |
| Registry URL changed in lockfile entries | Critical |
| Manifest changed but lockfile not regenerated | Important |
| CI not using frozen/locked install mode | Important |
| Lockfile entries missing integrity hashes | Important |
| Integrity hash using sha1 algorithm | Important |
| Multiple lockfile types for same ecosystem | Minor |
| Lockfile changed without manifest change (automated context) | Minor |
| Lockfile format version downgrade | Minor |
| Unusual transitive dependency growth (50+ new deps) | Minor |

## See Also

- `build-npm-yarn-pnpm-bun` -- npm/Yarn/pnpm/Bun-specific lockfile and configuration checks
- `build-pip-poetry-uv-pdm-rye` -- Python-specific lockfile and hash verification checks
- `build-cargo` -- Cargo.lock specifics for Rust binary vs library crates
- `build-go-modules` -- go.sum and checksum database verification
- `build-maven-gradle` -- Gradle lockfile and Maven dependency locking
- `build-bundler` -- Gemfile.lock specifics for Ruby
- `build-composer` -- composer.lock specifics for PHP
- `build-nuget` -- packages.lock.json specifics for .NET
- `build-swiftpm-cocoapods` -- Package.resolved and Podfile.lock specifics
- `build-mix-elixir` -- mix.lock specifics for Elixir
- `sec-owasp-a06-vulnerable-components` -- lockfile integrity as a defense against vulnerable components
- `sec-supply-chain-sbom-slsa-sigstore` -- lockfile as part of supply chain integrity

## Authoritative References

- [npm Documentation: package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)
- [Yarn Documentation: yarn.lock](https://yarnpkg.com/getting-started/qa#should-lockfiles-be-committed-to-the-repository)
- [Cargo Book: Cargo.lock](https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html)
- [Go Modules: go.sum](https://go.dev/ref/mod#go-sum-files)
- [Bundler: Rationale](https://bundler.io/guides/rationale.html)
- [lockfile-lint Documentation](https://github.com/lirantal/lockfile-lint)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
