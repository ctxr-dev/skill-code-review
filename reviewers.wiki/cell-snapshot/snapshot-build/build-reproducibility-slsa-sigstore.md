---
id: build-reproducibility-slsa-sigstore
type: primary
depth_role: leaf
focus: Detect non-reproducible build patterns, missing provenance attestation, absent SLSA compliance measures, unsigned artifacts, and missing build attestation
parents:
  - index.md
covers:
  - Non-reproducible builds due to timestamps, randomness, or host-dependent inputs
  - Missing provenance attestation for build artifacts
  - No SLSA level compliance in build pipeline
  - Unsigned artifacts published to registries or distribution channels
  - Missing build attestation linking artifact to source
  - Build environment not isolated or ephemeral
  - Source integrity not verified before build
  - Missing reproducible build verification step
  - Build parameters not captured in provenance
tags:
  - reproducibility
  - slsa
  - sigstore
  - cosign
  - provenance
  - attestation
  - signing
  - in-toto
  - supply-chain
  - build-integrity
activation:
  file_globs:
    - "**/.github/workflows/*"
    - "**/.gitlab-ci*"
    - "**/Jenkinsfile*"
    - "**/Dockerfile*"
    - "**/Makefile"
    - "**/Earthfile"
    - "**/cloudbuild.yaml"
    - "**/.goreleaser.yml"
    - "**/release.yml"
  keyword_matches:
    - slsa
    - SLSA
    - provenance
    - attestation
    - cosign
    - sigstore
    - sign
    - verify
    - reproducible
    - deterministic
    - in-toto
    - rekor
  structural_signals:
    - "CI/CD pipeline change"
    - release pipeline change
    - build configuration change
source:
  origin: file
  path: build-reproducibility-slsa-sigstore.md
  hash: "sha256:dce0cd7964ad795c55c4d12bbf27cf7c0cae35189905d5eb1913c5e2a1e753c1"
---
# Reproducible Builds, SLSA, and Sigstore

## When This Activates

Activates when diffs touch CI/CD pipeline files, release configurations, Dockerfiles, Makefiles, or build system configurations. This reviewer detects build integrity issues: non-reproducible patterns that embed timestamps, hostnames, or randomness into build outputs; missing provenance attestation that prevents verifying what source and build system produced an artifact; absent signing that allows artifact tampering; and build environments that do not meet SLSA framework requirements for isolation and auditability.

## Audit Surface

- [ ] Build output contains embedded timestamp varying per build
- [ ] Build output contains hostname, username, or build path
- [ ] Build uses non-deterministic ordering (map iteration, glob expansion)
- [ ] No SLSA provenance generation step in CI pipeline
- [ ] Artifact published without cosign/GPG/Sigstore signature
- [ ] Build environment is a persistent (non-ephemeral) machine
- [ ] Source not verified against commit SHA before build
- [ ] Build parameters (flags, env vars) not recorded in provenance
- [ ] No two-party review required for build pipeline changes
- [ ] Build pipeline can be triggered by non-maintainer without approval
- [ ] Missing in-toto layout or link metadata
- [ ] Artifact checksum not published alongside release
- [ ] Container image pushed without attestation (cosign attest)
- [ ] Build not verified by rebuilding and comparing output hash

## Detailed Checks

### Reproducibility Violations
<!-- activation: keywords=["timestamp", "date", "time", "hostname", "BUILD_", "random", "uuid", "glob", "os.listdir", "readdir", "walk", "ORDER"] -->

- [ ] **Embedded timestamp**: flag build scripts or source that embed `$(date)`, `__DATE__`, `__TIME__`, `BUILD_TIMESTAMP`, or `datetime.now()` into compiled outputs -- outputs differ on each build, preventing verification by rebuild
- [ ] **Host-dependent values**: flag build outputs containing `$(hostname)`, `$(whoami)`, `$USER`, `$HOME`, or absolute build paths -- these change between build environments, breaking reproducibility
- [ ] **Non-deterministic ordering**: flag build scripts that iterate over directories (`ls`, `os.listdir()`, `glob.glob()`, Go map iteration) without sorting -- file ordering varies by filesystem, producing different outputs
- [ ] **Non-deterministic archive creation**: flag `tar`, `zip`, or archive tools used without `--sort=name`, `--mtime=`, or equivalent flags to fix file ordering and timestamps -- archives with different metadata are not byte-identical
- [ ] **Floating tool versions in build**: flag CI steps that install build tools (compilers, linkers, code generators) without version pinning -- different tool versions produce different outputs

### SLSA Provenance
<!-- activation: keywords=["slsa", "provenance", "attest", "generate", "predicate", "builder", "buildType", "materials", "subject"] -->

- [ ] **No provenance generation**: flag CI pipelines that produce release artifacts without generating SLSA provenance attestation -- provenance records which source, builder, and parameters produced the artifact, enabling audit
- [ ] **Provenance not attached to artifact**: flag provenance generated but not attached to or published alongside the artifact (OCI referrer, release asset, Rekor entry) -- unattached provenance is not discoverable
- [ ] **Build parameters not in provenance**: flag provenance attestations missing `buildConfig` or `parameters` fields -- incomplete provenance cannot fully reproduce the build
- [ ] **Non-ephemeral build environment**: flag build pipelines running on persistent (long-lived) machines or self-hosted runners without attestation of the runner's integrity -- SLSA Level 3 requires hardened, ephemeral build platforms
- [ ] **Missing source verification**: flag build pipelines that do not verify the source commit SHA matches the expected value before building -- a compromised CI step could substitute different source

### Artifact Signing
<!-- activation: keywords=["cosign", "sign", "GPG", "gpg", "sigstore", "keyless", "Rekor", "notary", "verify", "signature", "key"] -->

- [ ] **Unsigned artifact published**: flag container images pushed to registries, binaries uploaded to release pages, or packages published to registries without signing (cosign sign, GPG sign, Sigstore) -- unsigned artifacts cannot be verified for integrity
- [ ] **Signature not verified on consumption**: flag deployment or installation steps that pull artifacts without verifying their signature -- signing without verification provides no protection
- [ ] **Missing checksum publication**: flag release pipelines that do not publish SHA-256 checksums alongside release artifacts -- checksums enable consumers to verify downloads independently
- [ ] **Private key in CI environment**: flag signing workflows that reference a private key stored as a CI secret rather than using keyless signing (Sigstore) or a KMS-backed key -- key material in CI secrets can be exfiltrated

### Build Pipeline Security
<!-- activation: keywords=["pipeline", "workflow", "trigger", "approval", "review", "permission", "token", "GITHUB_TOKEN", "deploy", "release"] -->

- [ ] **No two-party review for pipeline changes**: flag CI/CD configuration files (.github/workflows, .gitlab-ci.yml) that can be modified without requiring code review approval -- a single compromised account can modify the build pipeline
- [ ] **Overly permissive pipeline triggers**: flag release or deploy pipelines that can be triggered by any contributor without maintainer approval -- unauthorized builds may produce compromised artifacts
- [ ] **Excessive GITHUB_TOKEN permissions**: flag workflows with `permissions: write-all` or broad `contents: write` when narrower permissions suffice -- excess permissions increase blast radius if the pipeline is compromised
- [ ] **Missing build isolation**: flag builds that share state with previous builds (reuse build directories, share caches without integrity verification) -- build isolation prevents a compromised earlier build from affecting subsequent ones

## Common False Positives

- **Embedded version/commit SHA**: embedding the git commit SHA or semantic version is standard practice and aids debugging. Flag only truly non-deterministic values (timestamps, random).
- **Development builds without signing**: local development builds and PR CI builds do not need signing or provenance. Flag only release and production pipelines.
- **Self-hosted runners for performance**: organizations may use persistent self-hosted runners for cost efficiency. Verify they have attestation mechanisms rather than flagging their use outright.
- **Intentional non-determinism for security**: some builds intentionally use ASLR or stack canaries that vary per build. These are security features, not reproducibility bugs.

## Severity Guidance

| Finding | Severity |
|---|---|
| Release artifact published without signature | Critical |
| No provenance attestation for production release | Critical |
| Private signing key stored as CI secret (not KMS or keyless) | Critical |
| Pipeline changes not requiring two-party review | Important |
| Embedded timestamp or hostname in release binary | Important |
| Non-ephemeral build environment for release pipeline | Important |
| Provenance generated but not attached to artifact | Important |
| Missing checksum publication for release artifacts | Important |
| Non-deterministic archive ordering in build | Minor |
| Floating tool version in CI build step | Minor |
| SLSA Level 1 not met (no provenance exists) | Minor |

## See Also

- `sec-supply-chain-sbom-slsa-sigstore` -- SBOM and supply chain integrity checks complementing build reproducibility
- `sec-owasp-a08-integrity-failures` -- software integrity verification failures
- `build-bazel-buck-pants` -- hermetic build systems with inherent reproducibility support
- `build-earthly` -- Earthly-specific reproducibility patterns
- `build-lockfile-hygiene` -- lockfile determinism as a prerequisite for reproducible builds

## Authoritative References

- [SLSA Framework Specification v1.0](https://slsa.dev/spec/v1.0/)
- [Sigstore Documentation](https://docs.sigstore.dev/)
- [cosign Documentation](https://docs.sigstore.dev/cosign/overview/)
- [in-toto Framework](https://in-toto.io/)
- [Reproducible Builds Project](https://reproducible-builds.org/)
- [NIST SP 800-218: Secure Software Development Framework](https://csrc.nist.gov/publications/detail/sp/800-218/final)
- [OpenSSF SLSA Provenance](https://slsa.dev/provenance/)
