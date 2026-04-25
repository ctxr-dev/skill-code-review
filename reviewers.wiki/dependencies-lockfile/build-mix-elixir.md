---
id: build-mix-elixir
type: primary
depth_role: leaf
focus: "Detect Mix misconfigurations including missing mix.lock, git dependencies without ref pinning, missing :only for dev/test deps, and absent compilation warnings-as-errors"
parents:
  - index.md
covers:
  - Missing mix.lock file in application repositories
  - Dependencies from git without ref or tag pin
  - "Missing :only option for dev/test dependencies"
  - Compilation warnings not treated as errors
  - Hex packages without checksum verification
  - Override dependencies masking upstream fixes
  - Retired Hex packages still in dependencies
  - "Missing Elixir/OTP version requirements"
  - Umbrella app dependency mismanagement
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
activation:
  file_globs:
    - mix.exs
    - mix.lock
    - "config/config.exs"
    - "config/runtime.exs"
    - .tool-versions
  keyword_matches:
    - deps
    - hex
    - mix
    - elixir
    - override
    - "only:"
    - "runtime:"
    - "git:"
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - elixir_project_change
source:
  origin: file
  path: build-mix-elixir.md
  hash: "sha256:5281cd0fa2afeeab7f9f0753b8b35fd3a795a4782a7e419f71007b62b18210fd"
---
# Mix (Elixir Package Manager)

## When This Activates

Activates when diffs touch mix.exs, mix.lock, config/*.exs, or .tool-versions. This reviewer detects Elixir Mix misconfigurations: missing mix.lock allowing non-deterministic dependency resolution, git dependencies without commit pinning, dev/test dependencies leaking into production releases, absent compilation warning enforcement, and override directives masking upstream security fixes.

## Audit Surface

- [ ] mix.lock missing from application repository
- [ ] mix.exs dependency with git: option but no ref: or tag:
- [ ] mix.exs dependency missing only: [:dev, :test] for test/dev tools
- [ ] mix.exs missing elixir: version requirement in project/0
- [ ] Compilation without --warnings-as-errors in CI
- [ ] mix.exs using override: true without documented justification
- [ ] Hex dependency marked as retired still in mix.exs
- [ ] path: dependency in production application
- [ ] Missing mix audit or mix_audit in CI pipeline
- [ ] Umbrella app with circular dependency between children
- [ ] mix.lock containing only: :test dependency resolved for production
- [ ] Missing OTP version requirement in mix.exs

## Detailed Checks

### Lockfile Integrity
<!-- activation: file_globs=["mix.exs", "mix.lock", ".gitignore"], keywords=["lock", "deps.get", "deps.update", "hex"] -->

- [ ] **Missing mix.lock**: flag application repositories with mix.exs but no mix.lock -- without mix.lock, `mix deps.get` resolves the latest matching versions, producing different results across environments
- [ ] **Lockfile in .gitignore**: flag .gitignore excluding mix.lock -- application lockfiles must be committed for deterministic builds
- [ ] **Lock out of sync**: flag diffs where mix.exs dependency list changes but mix.lock is not updated -- run `mix deps.get` after modifying dependencies
- [ ] **CI running deps.update instead of deps.get**: flag CI scripts using `mix deps.update --all` instead of `mix deps.get` -- `deps.update` ignores the lockfile and resolves fresh versions

### Dependency Pinning and Sources
<!-- activation: keywords=["git:", "ref:", "tag:", "branch:", "path:", "hex:", "override:", "version"] -->

- [ ] **Git dependency without ref**: flag `{:dep, git: "https://...", branch: "main"}` or git deps without `ref:` -- branches are mutable; use `ref:` with a full commit SHA for reproducibility
- [ ] **Path dependency in production**: flag `{:dep, path: "../local_dep"}` in a production application -- path dependencies are not portable and break builds on other machines
- [ ] **Override without justification**: flag `override: true` in mix.exs without a code comment explaining why -- overrides suppress version conflicts and can mask security fixes in transitive dependencies
- [ ] **Retired Hex package**: flag dependencies on Hex packages that have been retired -- retired packages have known issues; migrate to the suggested replacement

### Dev/Test Isolation
<!-- activation: keywords=["only:", ":dev", ":test", ":prod", "runtime:", "compile_env"] -->

- [ ] **Missing :only for dev/test deps**: flag dev/test tools (ex_doc, credo, dialyxir, excoveralls, mox, bypass) without `only: [:dev, :test]` or `only: :test` -- these packages are compiled and available in production releases unnecessarily
- [ ] **runtime: false missing for compile-only deps**: flag compile-time-only dependencies (protocol implementations, code generators) without `runtime: false` -- these are included in release but never started
- [ ] **Test dependency resolved for production**: flag mix.lock entries showing test-only packages resolved without the :only restriction -- indicates the :only option was added after initial resolution

### Compilation Strictness and Version Requirements
<!-- activation: keywords=["warnings-as-errors", "elixir:", "erlang", "OTP", ".tool-versions", "compile"] -->

- [ ] **Missing --warnings-as-errors in CI**: flag CI mix compile commands without `--warnings-as-errors` -- warnings in Elixir often indicate real bugs (unused variables hiding logic errors, pattern match issues)
- [ ] **Missing elixir version requirement**: flag mix.exs project/0 without `elixir: "~> 1.15"` or equivalent -- consumers and CI cannot detect Elixir version incompatibility
- [ ] **Missing OTP version requirement**: flag applications without OTP version pinning in .tool-versions or mix.exs -- OTP version mismatches cause subtle runtime behavior differences
- [ ] **Missing mix audit in CI**: flag CI pipelines without `mix audit` or `mix hex.audit` -- known vulnerabilities and retired packages are only caught by automated scanning

### Umbrella Application Hygiene
<!-- activation: keywords=["umbrella", "apps_path", "in_umbrella", "deps_path"] -->

- [ ] **Circular umbrella dependency**: flag umbrella child applications with circular dependencies on each other -- circular deps indicate coupled modules that should be merged or restructured
- [ ] **Inconsistent dependency versions across umbrella children**: flag the same dependency at different versions in different umbrella children -- all children should agree on dependency versions via the umbrella root

## Common False Positives

- **Library packages omitting mix.lock**: Hex library packages conventionally do not commit mix.lock. Flag only for deployable applications and services.
- **Path dependencies in umbrella apps**: umbrella children reference siblings via path dependencies by design. Flag path dependencies only in non-umbrella production applications.
- **Override for known compatibility**: some well-known library conflicts require overrides (e.g., multiple libraries depending on different Jason versions). Verify the override references a compatible version.
- **--warnings-as-errors in library CI only**: libraries may choose to run --warnings-as-errors only in their own CI, not enforcing it on consumers.

## Severity Guidance

| Finding | Severity |
|---|---|
| mix.lock missing from application repository | Critical |
| Git dependency without ref pin on main branch | Important |
| Override masking a security fix in transitive dependency | Important |
| Dev/test dependencies without :only restriction | Important |
| Retired Hex package still in dependencies | Important |
| Path dependency in production application | Important |
| Missing elixir version requirement in mix.exs | Minor |
| Missing --warnings-as-errors in CI | Minor |
| Missing mix audit in CI pipeline | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in Hex/Erlang dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for released packages

## Authoritative References

- [Mix Documentation: Dependencies](https://hexdocs.pm/mix/Mix.Tasks.Deps.html)
- [Hex.pm Documentation: Publishing](https://hex.pm/docs/publish)
- [mix_audit Documentation](https://github.com/mirego/mix_audit)
- [Elixir Release Documentation](https://hexdocs.pm/mix/Mix.Tasks.Release.html)
