---
id: build-bazel-buck-pants
type: primary
depth_role: leaf
focus: Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts
parents:
  - index.md
covers:
  - Non-hermetic builds accessing network or host filesystem
  - Missing BUILD or BUILD.bazel files for new source directories
  - "External dependencies unpinned (http_archive without sha256)"
  - Remote cache without authentication or TLS
  - Large genrule scripts embedding complex shell logic
  - Repository rules with non-reproducible behavior
  - Missing visibility restrictions on internal targets
  - Toolchain not pinned to specific version
  - Workspace file pulling from mutable URLs
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
activation:
  file_globs:
    - BUILD
    - BUILD.bazel
    - WORKSPACE
    - WORKSPACE.bazel
    - MODULE.bazel
    - .bazelrc
    - BUCK
    - TARGETS
    - BUILD.pants
    - pants.toml
  keyword_matches:
    - http_archive
    - http_file
    - git_repository
    - genrule
    - visibility
    - remote_cache
    - toolchain
    - repository_rule
    - module
  structural_signals:
    - build_configuration_change
    - external_dependency_change
    - build_target_change
source:
  origin: file
  path: build-bazel-buck-pants.md
  hash: "sha256:ee5b2322d53a9b0c609bb5d4e6e764d4a7c18ac6dbd0e041714b58951cddebb1"
---
# Bazel, Buck, and Pants (Hermetic Build Systems)

## When This Activates

Activates when diffs touch BUILD files (BUILD, BUILD.bazel, BUCK, TARGETS, BUILD.pants), workspace files (WORKSPACE, MODULE.bazel), configuration (.bazelrc, pants.toml), or external dependency declarations. This reviewer detects hermeticity violations: external dependencies fetched without integrity verification, genrules with network access or host filesystem dependencies, remote cache configurations lacking authentication, and repository rules with non-reproducible behavior. Hermetic build systems derive their value from deterministic, sandboxed builds -- misconfigurations that break hermeticity defeat the entire purpose.

## Audit Surface

- [ ] http_archive or http_file without sha256 integrity hash
- [ ] git_repository without commit pin (uses branch or tag)
- [ ] genrule with large shell script (>20 lines) or network access
- [ ] BUILD file missing for new source directory
- [ ] Remote cache configured without --remote_cache_header for auth
- [ ] Remote execution without TLS (grpc:// instead of grpcs://)
- [ ] Rule target with visibility = ['//visibility:public'] in internal package
- [ ] Repository rule using ctx.execute with non-hermetic commands
- [ ] Toolchain registered without version pin
- [ ] WORKSPACE or MODULE.bazel fetching from mutable URL
- [ ] Action depending on host environment variable without declare
- [ ] Test target without size or timeout declaration
- [ ] Unused dependency in BUILD file
- [ ] Circular dependency between BUILD targets

## Detailed Checks

### External Dependency Integrity
<!-- activation: file_globs=["WORKSPACE", "WORKSPACE.bazel", "MODULE.bazel", "*.bzl"], keywords=["http_archive", "http_file", "git_repository", "sha256", "urls", "strip_prefix"] -->

- [ ] **http_archive without sha256**: flag `http_archive(urls=[...])` without `sha256` attribute -- without the hash, Bazel cannot verify the downloaded archive was not tampered with
- [ ] **git_repository without commit**: flag `git_repository(remote=..., branch="main")` or `tag="v1.0"` without `commit=` -- branches and tags are mutable; pin to the full commit SHA
- [ ] **Mutable URL in fetch**: flag WORKSPACE or MODULE.bazel entries fetching from URLs containing `latest`, `stable`, or channel paths -- the content at these URLs changes over time, breaking reproducibility
- [ ] **Missing mirror or fallback URL**: flag http_archive with a single URL pointing to a third-party host -- if the host goes down, all builds break; provide mirror URLs

### Hermeticity Violations
<!-- activation: keywords=["genrule", "ctx.execute", "repository_rule", "local_repository", "environment", "PATH", "HOME", "exec_tools"] -->

- [ ] **Network access in genrule**: flag genrule cmd strings containing `curl`, `wget`, `git clone`, or any network tool -- genrules must not access the network; fetch external content as explicit dependencies
- [ ] **Large genrule script**: flag genrule cmd exceeding 20 lines of shell -- complex shell logic in genrules is fragile and hard to test; extract into a proper rule or a shell script checked into the repo
- [ ] **Repository rule with non-hermetic ctx.execute**: flag repository_rule implementations calling `ctx.execute` on host tools without `environment` restrictions -- host-dependent execution produces different results on different machines
- [ ] **Host environment variable dependency**: flag actions or rules depending on environment variables (PATH, HOME, USER) without declaring them via `--action_env` -- undeclared env deps break caching and reproducibility
- [ ] **local_repository for production deps**: flag `local_repository()` in WORKSPACE for dependencies used in production builds -- local paths are machine-specific and non-reproducible

### Remote Cache and Execution Security
<!-- activation: keywords=["remote_cache", "remote_executor", "grpc", "grpcs", "remote_header", "tls", "disk_cache", "bes_backend"] -->

- [ ] **Remote cache without auth**: flag `--remote_cache` configured without `--remote_cache_header` or equivalent authentication -- unauthenticated caches can be poisoned by any network peer
- [ ] **Remote execution without TLS**: flag `--remote_executor=grpc://` instead of `grpcs://` -- unencrypted remote execution exposes build actions and outputs to network interception
- [ ] **BES backend without TLS**: flag `--bes_backend` using unencrypted protocol -- Build Event Service can contain sensitive build information
- [ ] **Disk cache on shared filesystem**: flag `--disk_cache` pointing to a shared network filesystem without access control -- other users can read or poison cached artifacts

### Visibility and Build Graph Hygiene
<!-- activation: keywords=["visibility", "public", "deps", "size", "timeout", "tags", "unused"] -->

- [ ] **Overly broad visibility**: flag `visibility = ["//visibility:public"]` on internal-only targets -- internal libraries should restrict visibility to consuming packages to prevent unintended coupling
- [ ] **Missing BUILD file**: flag new source directories without a BUILD file -- the build system cannot build or test code without build definitions
- [ ] **Unused dependency**: flag deps listed in a BUILD target that are not actually imported by the source -- unused deps slow incremental builds and obscure the real dependency graph
- [ ] **Missing test size/timeout**: flag test targets without `size` or `timeout` attributes -- Bazel uses size to allocate resources and timeout to prevent hung tests from blocking CI

## Common False Positives

- **local_repository for development overrides**: developers commonly use local_repository for rapid iteration on companion libraries. Flag only in CI-facing or main-branch WORKSPACE files.
- **genrule for code generation**: short genrules that run code generators (protoc, thrift) are standard practice. Flag only when the genrule is excessively complex or accesses the network.
- **//visibility:public on published libraries**: open-source or platform-wide libraries intentionally use public visibility. Flag only for implementation-detail targets.
- **Test targets without size in small projects**: small projects with fast tests may not need size declarations. Flag in monorepos where test sizing affects CI parallelism.

## Severity Guidance

| Finding | Severity |
|---|---|
| Remote cache without authentication | Critical |
| Remote execution without TLS | Critical |
| http_archive without sha256 integrity hash | Important |
| git_repository without commit pin | Important |
| genrule with network access | Important |
| Repository rule with non-hermetic ctx.execute | Important |
| Host environment variable dependency without declaration | Important |
| Overly broad visibility on internal target | Minor |
| Missing test size or timeout | Minor |
| Unused dependency in BUILD file | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `build-reproducibility-slsa-sigstore` -- reproducible build requirements for hermetic build systems
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for build artifacts
- `build-vendored-toolchain` -- vendored toolchain version pinning

## Authoritative References

- [Bazel: External Dependencies](https://bazel.build/external/overview)
- [Bazel: Hermeticity](https://bazel.build/concepts/hermeticity)
- [Bazel: Remote Caching](https://bazel.build/remote/caching)
- [Buck2 Documentation](https://buck2.build/)
- [Pants Documentation: Third-Party Dependencies](https://www.pantsbuild.org/docs/third-party-dependencies)
