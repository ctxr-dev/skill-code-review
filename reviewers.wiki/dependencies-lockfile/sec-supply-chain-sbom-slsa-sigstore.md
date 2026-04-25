---
id: sec-supply-chain-sbom-slsa-sigstore
type: primary
depth_role: leaf
focus: Detect supply chain vulnerabilities including unpinned dependencies, mutable image tags, missing lock files, unsigned artifacts, absent SBOM generation, and dependency confusion risks
parents:
  - index.md
covers:
  - "CI/CD pipelines using unpinned actions (actions/checkout@main instead of SHA)"
  - "Dockerfile FROM instructions with mutable tags (:latest, :stable) instead of digest"
  - Package installs from git URLs without pinned commit hash
  - "Missing or outdated lock files (package-lock.json, poetry.lock, Cargo.lock)"
  - CI artifacts not signed or verified before deployment
  - No SBOM generation in build pipeline
  - "Third-party scripts downloaded and piped to shell (curl | bash)"
  - Missing provenance attestation for build artifacts
  - Dependency confusion risk from private package names squattable on public registries
  - Typosquatting risk in dependency names
  - "Missing integrity checks (checksums, signatures) on downloaded binaries"
  - Unpinned compiler, runtime, or tool versions in CI
  - No SBOM generated during container image build
  - SBOM not attached to image as attestation
  - "SBOM format not standardized (CycloneDX or SPDX)"
  - "SBOM not including all dependency layers (OS + language + app)"
  - SBOM not signed with cosign or in-toto attestation
  - SBOM not stored in registry as OCI artifact
  - Missing SBOM verification in deployment pipeline
  - SBOM not updated on image rebuild
  - No SBOM generated for base images
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
aliases:
  - container-sbom-cyclonedx-spdx
activation:
  file_globs:
    - "**/.github/workflows/*"
    - "**/.gitlab-ci*"
    - "**/Jenkinsfile*"
    - "**/Dockerfile*"
    - "**/docker-compose*"
    - "**/package.json"
    - "**/package-lock.json"
    - "**/yarn.lock"
    - "**/pnpm-lock.yaml"
    - "**/Pipfile*"
    - "**/poetry.lock"
    - "**/pyproject.toml"
    - "**/requirements*.txt"
    - "**/Cargo.toml"
    - "**/Cargo.lock"
    - "**/go.mod"
    - "**/go.sum"
    - "**/Gemfile*"
    - "**/pom.xml"
    - "**/build.gradle*"
    - "**/*.cabal"
    - "**/Makefile"
    - "**/*.sh"
  keyword_matches:
    - pipeline
    - CI
    - CD
    - action
    - workflow
    - Dockerfile
    - FROM
    - image
    - tag
    - digest
    - sha256
    - install
    - npm
    - pip
    - cargo
    - go get
    - SBOM
    - SLSA
    - sigstore
    - cosign
    - provenance
    - attestation
    - sign
    - verify
    - checksum
    - lock
    - integrity
    - registry
    - publish
  structural_signals:
    - "CI/CD workflow file change"
    - Dockerfile or container build change
    - Package manager configuration or lock file change
    - Build script or Makefile change
    - New dependency added
    - Dependency version changed
source:
  origin: file
  path: sec-supply-chain-sbom-slsa-sigstore.md
  hash: "sha256:a2075ae23271d63323c3b5dd2871a035f401333d128c16e3a0dafbb27e888711"
---
# Supply Chain Security, SBOM, SLSA, and Sigstore

## When This Activates

Activates when diffs touch CI/CD pipeline files, Dockerfiles, package manager configurations, lock files, build scripts, or dependency declarations. Supply chain attacks compromise software by targeting the build and delivery pipeline rather than the application code directly. This reviewer detects mutable dependency references that allow substitution attacks, missing integrity verification that allows tampering, absent provenance tracking that prevents audit, and dependency confusion vectors that allow namespace hijacking.

**Primary CWEs**: CWE-829 (Inclusion of Functionality from Untrusted Control Sphere), CWE-494 (Download of Code Without Integrity Check), CWE-1104 (Use of Unmaintained Third-Party Components).

## Audit Surface

- [ ] GitHub Actions workflow using action reference with branch tag instead of full SHA
- [ ] Dockerfile FROM with mutable tag (:latest, :stable, :lts, :current, major version only)
- [ ] npm install, pip install, or cargo install from git URL without commit pin
- [ ] Missing lock file for a package manager that supports one
- [ ] Lock file present but not committed to version control
- [ ] Build pipeline with no artifact signing step (cosign, GPG, Sigstore)
- [ ] Build pipeline with no SBOM generation step (syft, cyclonedx, trivy)
- [ ] Shell script downloaded from URL and piped directly to interpreter (curl | bash)
- [ ] Binary downloaded in CI without checksum or signature verification
- [ ] Private package name that could be registered on a public registry (dependency confusion)
- [ ] Dependency name that is a common typo of a popular package
- [ ] pip install or npm install with --no-verify or equivalent integrity bypass
- [ ] Docker image pulled without digest verification in production deployment
- [ ] Makefile or script downloading tools without version pin or checksum
- [ ] Go module using replace directive pointing to mutable reference
- [ ] Unpinned base image in multi-stage Docker build
- [ ] CI pipeline without SLSA provenance generation or verification

## Detailed Checks

### Unpinned CI/CD Actions and Plugins (CWE-829)
<!-- activation: keywords=["uses:", "action", "actions/", "workflow", "step", "job", "plugin", "orb", "template", "include", "stage", "pipeline"] -->

- [ ] **GitHub Actions with branch/tag reference**: flag `uses: actions/checkout@v4`, `uses: owner/action@main`, or any action reference without a full commit SHA (`uses: actions/checkout@abc123def456...`). Branch and tag references are mutable -- a compromised action can push a new commit to the tag. Pin to the full 40-character SHA and add a comment with the version for readability
- [ ] **Third-party actions from untrusted owners**: flag actions from unknown or unverified GitHub organizations, especially those performing privileged operations (pushing to registries, deploying, accessing secrets). Prefer actions from verified publishers or fork and pin trusted copies
- [ ] **GitLab CI includes from external URLs**: flag `include: remote:` directives that reference external YAML from URLs without integrity verification. The external YAML is fetched at pipeline runtime and can be modified between runs
- [ ] **Jenkins shared libraries without pinning**: flag Jenkins `@Library('lib')` references without version pinning. A compromised shared library executes in the Jenkins controller with full access to all jobs and credentials
- [ ] **Unpinned tool versions in CI**: flag CI steps that install tools (`npm install -g`, `pip install`, `go install`, `curl | bash`) without pinning to a specific version. Between builds, the latest version may change, introducing untested code into the build

### Container Image Pinning (CWE-829, CWE-494)
<!-- activation: keywords=["FROM", "image:", "docker", "container", "pull", "tag", "digest", "sha256:", "latest", "stable", "alpine", "ubuntu", "node:", "python:", "golang:", "openjdk:"] -->

- [ ] **FROM with mutable tag**: flag Dockerfile `FROM` instructions using `:latest`, `:stable`, `:lts`, major-version-only tags (`:3`, `:18`), or no tag at all (defaults to latest). These tags are mutable and can be overwritten with a compromised image. Pin to a specific digest: `FROM node:18.19.0@sha256:abc123...`
- [ ] **Multi-stage build with unpinned base**: flag multi-stage Dockerfiles where any stage uses an unpinned base image. Even intermediate stages (builder, test) that do not appear in the final image execute during build and can exfiltrate secrets or inject malicious artifacts
- [ ] **Docker Compose with unpinned images**: flag `docker-compose.yml` service definitions using mutable tags for images. Production docker-compose files should pin images to digests just like Dockerfiles
- [ ] **Kubernetes manifests with mutable image tags**: flag Kubernetes Deployment, StatefulSet, Job, or CronJob manifests where `spec.containers[].image` uses a mutable tag. Set `imagePullPolicy: Always` as a defense in depth, but pinning to digest is the primary control
- [ ] **Missing image pull policy**: flag Kubernetes manifests that use a mutable tag without `imagePullPolicy: Always`. With the default `IfNotPresent` policy, different nodes may run different versions of the same mutable tag

### Lock Files and Dependency Integrity (CWE-494)
<!-- activation: keywords=["lock", "package-lock", "yarn.lock", "pnpm-lock", "poetry.lock", "Cargo.lock", "Pipfile.lock", "Gemfile.lock", "go.sum", "composer.lock", "integrity", "hash", "checksum", "sha512", "shasum"] -->

- [ ] **Missing lock file**: flag projects with a package manager manifest (package.json, Pipfile, Cargo.toml, Gemfile) but no corresponding lock file. Without a lock file, every `install` resolves to the latest matching version, which may differ between environments and could include a compromised release published between installs
- [ ] **Lock file not committed**: flag `.gitignore` rules that exclude lock files. Lock files must be committed to ensure all developers, CI, and production use identical dependency versions. The only exception is libraries (as opposed to applications), where some ecosystems recommend not committing the lock file
- [ ] **Lock file out of sync**: flag diffs where the manifest (package.json, Cargo.toml) is modified but the lock file is not updated. This suggests the developer modified dependencies without running `install` or `lock`, and the lock file no longer reflects the manifest
- [ ] **Integrity bypass flags**: flag `npm install --no-package-lock`, `pip install --no-deps`, `--no-verify`, `--ignore-scripts` in production builds, or any flag that disables integrity checking. These flags defeat the purpose of lock files and integrity hashes
- [ ] **npm/yarn without integrity hashes**: flag lock files that lack `integrity` fields (SHA-512 hashes). Modern npm and yarn include integrity hashes by default; their absence suggests an older lock file format or manual tampering

### Curl-Pipe-Bash and Unverified Downloads (CWE-494)
<!-- activation: keywords=["curl", "wget", "fetch", "download", "pipe", "bash", "sh", "install.sh", "setup.sh", "get.sh", "checksum", "sha256sum", "gpg", "verify", "pgp"] -->

- [ ] **Curl piped to shell**: flag `curl ... | bash`, `curl ... | sh`, `wget ... | bash`, or any pattern that downloads a script from a URL and pipes it directly to an interpreter. The script can change between download and execution, the HTTPS connection may be intercepted, and there is no integrity verification. Download to a file, verify the checksum, then execute
- [ ] **Binary download without checksum**: flag CI steps or Makefiles that download pre-built binaries (protoc, terraform, kubectl, helm) without verifying a SHA-256 checksum against a known-good value. A compromised CDN or MITM can substitute a malicious binary
- [ ] **Missing GPG signature verification**: flag downloads of signed releases where the signature is available but not verified. Many projects (Docker, Kubernetes, GNU tools) provide GPG signatures alongside releases; failing to verify them wastes the protection
- [ ] **HTTP (not HTTPS) download**: flag any download URL in CI/CD or build scripts using `http://` instead of `https://`. Unencrypted downloads are trivially intercepted and modified on the network
- [ ] **Download URL with no version pin**: flag download URLs that reference `latest`, `stable`, or a channel URL instead of a specific version (e.g., `https://get.helm.sh/helm-latest-linux-amd64.tar.gz` vs. `helm-v3.14.2-linux-amd64.tar.gz`). Without version pinning, the downloaded content changes silently

### Dependency Confusion and Typosquatting (CWE-829)
<!-- activation: keywords=["registry", "publish", "scope", "namespace", "private", "internal", "proxy", "nexus", "artifactory", "verdaccio", "pypi", "npmjs", "crates.io", "rubygems", "maven"] -->

- [ ] **Private package without scope/namespace**: flag npm packages without an `@scope/` prefix, Python packages, or other dependencies that use names which could be registered on the public registry by an attacker. If the internal registry is checked after the public one (or as a fallback), an attacker can publish a higher-version package on the public registry that gets installed instead
- [ ] **Missing registry configuration**: flag projects with private dependencies but no `.npmrc`, `pip.conf`, `pyproject.toml [tool.poetry.source]`, or equivalent registry configuration that explicitly routes private package names to the internal registry
- [ ] **Typosquatting proximity**: flag newly added dependencies whose names differ from popular packages by one character (substitution, transposition, omission, or addition). Common examples: `lodahs` vs `lodash`, `reqeusts` vs `requests`, `colros` vs `colors`. Not all will be malicious, but new dependencies with suspicious names warrant verification
- [ ] **Git dependency without commit pin**: flag dependencies installed from git repositories using branch names (`@main`, `@master`, `@develop`) or tags instead of a full commit SHA. A compromised repository can force-push to a branch or delete and recreate a tag
- [ ] **Mixed public and private sources**: flag package manager configurations that mix public and private registries without explicit scoping. Without scoping, the package manager may resolve a private package name from the public registry, enabling dependency confusion

### SBOM, Provenance, and Signing (CWE-494)
<!-- activation: keywords=["sbom", "SBOM", "spdx", "SPDX", "cyclonedx", "CycloneDX", "syft", "trivy", "grype", "slsa", "SLSA", "provenance", "attest", "attestation", "cosign", "sigstore", "sign", "verify", "notary", "in-toto", "rekor"] -->

- [ ] **No SBOM generation**: flag build pipelines that produce deployable artifacts (container images, binaries, packages) without generating a Software Bill of Materials. SBOM enables vulnerability tracking, license compliance, and incident response. Use syft, trivy, or cyclonedx-cli to generate SBOM in CycloneDX or SPDX format
- [ ] **No artifact signing**: flag container images pushed to a registry without signing (cosign, Notary/TUF, GPG). Without signatures, there is no way to verify that the image in the registry was produced by the trusted build pipeline and has not been tampered with
- [ ] **No provenance attestation**: flag build pipelines without SLSA provenance attestation. Provenance records which source code, build system, and parameters produced an artifact. SLSA Level 1 requires provenance exists; Level 2 requires it is generated by a hosted build service; Level 3 requires a hardened build platform
- [ ] **Signature not verified on deploy**: flag deployment pipelines that pull and deploy artifacts without verifying their signature. Signing without verification provides no protection -- both steps are required. Use `cosign verify` or equivalent before deploying
- [ ] **SBOM not attached to artifact**: flag pipelines that generate SBOM but do not attach it to the artifact (e.g., as an OCI artifact referrer, in a release asset, or in a known location). An SBOM that is not discoverable alongside the artifact provides limited value

## Common False Positives

- **Development-only Dockerfiles**: Dockerfiles used only for local development (`Dockerfile.dev`, `docker-compose.dev.yml`) may legitimately use mutable tags for convenience. Flag only if the file could be used in production or CI.
- **First-party actions in the same repository**: `uses: ./.github/actions/my-action` references code in the same repository at the same commit, which is inherently pinned. Only flag external action references.
- **Renovate/Dependabot comments**: automated dependency update PRs may show unpinned versions in the diff as they are being updated. Check if a bot is pinning to a specific version/SHA in the new value.
- **Library lock files**: some ecosystems recommend that libraries (as opposed to applications) do not commit lock files so that downstream consumers test against the latest compatible versions. Valid for npm libraries, Python libraries; not valid for applications or services.
- **Intentionally unpinned development tools**: local development tool versions (linters, formatters) in a Makefile may be intentionally unpinned for convenience. Flag only when the tool executes in CI or production.
- **SBOM for internal-only artifacts**: artifacts deployed only within a private network with no external distribution may have a lower SBOM priority. Still recommend SBOM for vulnerability tracking.

## Severity Guidance

| Finding | Severity |
|---|---|
| CI/CD action pinned to branch/tag (not SHA) that accesses secrets or deploys | Critical |
| Curl piped to bash in production build or deployment pipeline | Critical |
| Production Dockerfile FROM with :latest or no tag and no digest | Critical |
| Dependency confusion: private package name registrable on public registry | Critical |
| Binary downloaded in CI without checksum verification | Important |
| Missing lock file for a production application | Important |
| Lock file not committed to version control | Important |
| No artifact signing in build pipeline for production images | Important |
| Git dependency pinned to branch name instead of commit SHA | Important |
| HTTP (not HTTPS) download URL in build script | Important |
| No SBOM generation in build pipeline | Important |
| Kubernetes manifest with mutable image tag in production | Important |
| Missing registry scoping for projects with private dependencies | Important |
| CI tool installed without version pin (non-privileged step) | Minor |
| SBOM generated but not attached to artifact | Minor |
| Development Dockerfile using mutable tag | Minor |
| Provenance attestation absent (SLSA Level 1 not met) | Minor |

## See Also

- `sec-owasp-a06-vulnerable-components` -- known vulnerabilities in dependencies are the flip side of supply chain integrity
- `sec-owasp-a08-integrity-failures` -- software and data integrity failures including unsigned updates and CI/CD compromise
- `sec-owasp-a05-misconfiguration` -- misconfigured registries, missing security scanning, and CI/CD pipeline hardening
- `principle-fail-fast` -- build pipelines should fail immediately on integrity check failure rather than proceeding with unverified artifacts

## Authoritative References

- [CWE-829: Inclusion of Functionality from Untrusted Control Sphere](https://cwe.mitre.org/data/definitions/829.html)
- [CWE-494: Download of Code Without Integrity Check](https://cwe.mitre.org/data/definitions/494.html)
- [CWE-1104: Use of Unmaintained Third-Party Components](https://cwe.mitre.org/data/definitions/1104.html)
- [SLSA Framework Specification](https://slsa.dev/spec/v1.0/)
- [Sigstore Documentation](https://docs.sigstore.dev/)
- [OpenSSF Scorecard](https://securityscorecards.dev/)
- [OWASP Software Component Verification Standard](https://owasp.org/www-project-software-component-verification-standard/)
- [NIST SP 800-218: Secure Software Development Framework (SSDF)](https://csrc.nist.gov/publications/detail/sp/800-218/final)
- [npm Dependency Confusion - Alex Birsan](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
