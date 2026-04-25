---
id: iac-nix
type: primary
depth_role: leaf
focus: Detect Nix and NixOS misconfigurations including unpinned flake inputs, impure derivations, missing flake checks, large closure sizes, uncached store paths in CI, missing devShell, and unfree package allowances
parents:
  - index.md
covers:
  - Flake inputs not pinned to specific revision
  - Impure derivations breaking reproducibility
  - Missing nix flake check in CI pipeline
  - Large closure size inflating deployment artifacts
  - Nix store paths not cached in CI -- slow builds
  - Missing devShell for development environment
  - Unfree packages used without explicit allowUnfree
  - Overlays shadowing upstream packages without documentation
  - Missing flake.lock committed to version control
  - NixOS module without option type declarations
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
activation:
  file_globs:
    - "**/flake.nix"
    - "**/flake.lock"
    - "**/default.nix"
    - "**/shell.nix"
    - "**/*.nix"
    - "**/configuration.nix"
  keyword_matches:
    - flake
    - nixpkgs
    - devShell
    - mkDerivation
    - buildInputs
    - nativeBuildInputs
    - overlay
    - NixOS
    - mkOption
    - pkgs
    - lib.mkDefault
    - allowUnfree
  structural_signals:
    - flake_nix_structure
    - nixos_module_structure
    - derivation_definition
    - overlay_definition
source:
  origin: file
  path: iac-nix.md
  hash: "sha256:2ffa3d262f3c694c30e9013deabe70655e55610210ee278d7e27cb725d47e891"
---
# Nix

## When This Activates

Activates when diffs touch Nix files including flake.nix, flake.lock, default.nix, shell.nix, or NixOS modules. Nix provides reproducible builds and deployments through functional package management -- but unpinned flake inputs break reproducibility, impure derivations introduce non-determinism, large closures waste storage and bandwidth, and unfree packages without explicit allowance fail silently on strict evaluators. This reviewer catches Nix-specific misconfigurations that break reproducibility, inflate artifacts, and cause CI failures.

## Audit Surface

- [ ] Flake input without locked revision
- [ ] Impure derivation (builtins.fetchurl, builtins.fetchGit)
- [ ] CI without nix flake check step
- [ ] Closure size exceeding 500MB
- [ ] CI without nix store caching
- [ ] Flake without devShells output
- [ ] Unfree package without explicit allowance
- [ ] Overlay shadowing nixpkgs without comment
- [ ] Missing flake.lock in repository
- [ ] NixOS module option without type
- [ ] Fixed-output derivation hash mismatch risk
- [ ] Flake without multi-system CI matrix

## Detailed Checks

### Flake Input Pinning
<!-- activation: keywords=["inputs", "follows", "flake.lock", "nixpkgs", "rev", "url", "github:", "git+"] -->

- [ ] **Unpinned flake input**: flag flake inputs without a locked revision in flake.lock -- unpinned inputs resolve to latest on `nix flake update`, breaking reproducibility; commit flake.lock and update inputs deliberately
- [ ] **Missing flake.lock**: flag repositories with flake.nix but no committed flake.lock -- without the lock file, every evaluation resolves inputs to the latest revision, producing different results on different machines
- [ ] **Input without follows**: flag flake inputs that duplicate nixpkgs without `inputs.nixpkgs.follows = "nixpkgs"` -- each unlinked nixpkgs input adds a separate nixpkgs evaluation to the closure, dramatically increasing size and build time
- [ ] **Stale flake.lock**: flag flake.lock files not updated in over 90 days -- stale locks miss security patches in nixpkgs; balance pinning with regular update cycles

### Purity and Reproducibility
<!-- activation: keywords=["builtins.fetchurl", "builtins.fetchGit", "fetchurl", "fetchFromGitHub", "impure", "__impure", "allowSubstitutes", "sandbox"] -->

- [ ] **Impure fetchers in derivation**: flag derivations using `builtins.fetchurl`, `builtins.fetchGit`, or `builtins.fetchTarball` without a hash -- impure fetchers bypass the Nix sandbox and break reproducibility; use `fetchFromGitHub`, `fetchurl` with `sha256`, or flake inputs
- [ ] **__impure flag**: flag derivations marked `__impure = true` -- impure derivations can access the network and filesystem during build, breaking the reproducibility guarantee; isolate impure steps or provide fixed-output hashes
- [ ] **Missing fixed-output hash**: flag fixed-output derivations where the hash is placeholder or commented out (`sha256 = lib.fakeSha256`) -- placeholder hashes pass evaluation but fail on build; compute and commit the correct hash

### Closure Size
<!-- activation: keywords=["closure", "nix-tree", "nix path-info", "size", "buildInputs", "propagatedBuildInputs", "runtimeDependencies"] -->

- [ ] **Large closure**: flag derivations where the runtime closure exceeds 500MB for a service or application -- large closures slow down deployment, increase storage cost, and often indicate development-only dependencies (compilers, headers) leaking into runtime; separate buildInputs from propagatedBuildInputs
- [ ] **Development dependencies in runtime closure**: flag `buildInputs` or `nativeBuildInputs` that propagate to runtime (e.g., gcc, cmake in runtime closure) -- use `nativeBuildInputs` for build-time-only tools and verify with `nix path-info -rsSh`
- [ ] **Missing CI cache**: flag CI configurations building Nix derivations without a binary cache (Cachix, Attic, or S3 substituter) -- without caching, every CI run rebuilds from source, consuming minutes to hours per build

### DevShell and Development Experience
<!-- activation: keywords=["devShell", "devShells", "mkShell", "shellHook", "inputsFrom", "shell.nix", "direnv", "nix develop"] -->

- [ ] **Missing devShell**: flag flakes without a `devShells` output -- without devShell, contributors must manually install dependencies or maintain a separate shell.nix, defeating the purpose of the flake
- [ ] **devShell without shellHook**: flag devShells that do not set up development tooling (formatters, linters, pre-commit hooks) in shellHook -- the devShell is the single source of truth for the development environment
- [ ] **shell.nix not backed by flake**: flag projects with both flake.nix and a standalone shell.nix that does not delegate to the flake -- two independent Nix expressions for the development environment creates drift

### NixOS Modules and Overlays
<!-- activation: keywords=["mkOption", "mkEnableOption", "config", "options", "overlay", "self.overlays", "lib.mkDefault", "types.", "module"] -->

- [ ] **Module option without type**: flag NixOS module options defined without `type` -- untyped options accept any value, making misconfiguration harder to detect; use `lib.types.str`, `lib.types.bool`, `lib.types.port`, etc.
- [ ] **Overlay shadowing without documentation**: flag overlays that override existing nixpkgs packages without a comment explaining why -- silent shadowing causes confusion when upstream updates are expected but the overlay overrides them
- [ ] **Unfree without explicit allowance**: flag derivations depending on unfree packages without `nixpkgs.config.allowUnfreePackages` or per-package `meta.license` overrides -- strict Nix evaluators (CI, NixOS rebuilds) reject unfree packages by default, causing build failures
- [ ] **Missing flake check**: flag CI pipelines without `nix flake check` -- flake check validates all outputs (packages, NixOS configurations, devShells) and runs any configured test suites

## Common False Positives

- **Impure derivations for network-dependent builds**: some derivations (Docker image fetches, npm/cargo downloads) require network access during build. These use fixed-output derivations with hashes, which is acceptable.
- **Large closures for NixOS system images**: full NixOS system closures are naturally large (1-3GB). The 500MB threshold applies to individual service derivations, not system images.
- **Missing devShell on library packages**: pure library packages may not need a devShell if they are developed within a larger monorepo flake.
- **shell.nix for non-flake compatibility**: maintaining shell.nix alongside flake.nix is common for users who have not adopted flakes.

## Severity Guidance

| Finding | Severity |
|---|---|
| Impure derivation without fixed-output hash | Critical |
| Missing flake.lock in repository | Critical |
| Development dependencies in runtime closure (security surface) | Important |
| Unpinned flake input | Important |
| Unfree package without explicit allowance | Important |
| Large closure exceeding 500MB for service | Important |
| Missing nix flake check in CI | Minor |
| Missing devShell | Minor |
| Missing CI binary cache | Minor |
| NixOS module option without type | Minor |
| Overlay shadowing without documentation | Minor |

## See Also

- `sec-owasp-a05-misconfiguration` -- Nix misconfigurations create deployment and security issues
- `iac-drift-detection` -- NixOS configurations are declarative but system drift still occurs
- `sec-secrets-management-and-rotation` -- secrets must not appear in Nix expressions or store paths
- `iac-terraform` -- Terraform and Nix share pinning and reproducibility concerns

## Authoritative References

- [Nix Flakes Documentation](https://nixos.wiki/wiki/Flakes)
- [NixOS Manual: Module System](https://nixos.org/manual/nixos/stable/#sec-writing-modules)
- [Nix Pills](https://nixos.org/guides/nix-pills/)
- [Cachix Documentation](https://docs.cachix.org/)
- [statix Linter](https://github.com/nerdypepper/statix)
