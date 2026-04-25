---
id: container-image-scanning-trivy-grype-clair
type: primary
depth_role: leaf
focus: Detect gaps in container image vulnerability scanning including missing CI integration, ignored critical findings, scan-only-at-build patterns, and incomplete package coverage
parents:
  - index.md
covers:
  - No image scanning step in CI pipeline
  - Scanning only at build time -- not in registry or runtime
  - "Ignoring CRITICAL/HIGH findings without documented exception"
  - Scanning without fixed-version base image -- findings unfixable
  - Missing .trivyignore or .grype.yaml for acknowledged CVEs
  - Scanning only OS packages -- missing language-specific dependencies
  - No scanning of third-party or base images
  - Scan results not failing the pipeline on severity threshold
  - Scanner not updated -- stale vulnerability database
  - Scan results not stored or tracked over time
tags:
  - container
  - scanning
  - vulnerability
  - trivy
  - grype
  - clair
  - CVE
  - security
  - pipeline
  - CWE-1395
activation:
  file_globs:
    - "**/.github/workflows/*"
    - "**/Jenkinsfile"
    - "**/.gitlab-ci.yml"
    - "**/Dockerfile*"
  keyword_matches:
    - trivy
    - grype
    - clair
    - scan
    - vulnerability
    - CVE
    - CRITICAL
    - HIGH
    - image
    - container
    - snyk container
source:
  origin: file
  path: container-image-scanning-trivy-grype-clair.md
  hash: "sha256:1e1656d9d2c46d4b3d6478a426552ae4b37a6f778578bd79819abd479e7d3454"
---
# Container Image Scanning -- Trivy, Grype, Clair

## When This Activates

Activates on diffs touching CI pipeline configurations (GitHub Actions workflows, GitLab CI, Jenkinsfile), Dockerfiles, or files referencing vulnerability scanning tools. Container images accumulate vulnerabilities from base OS packages, language-specific dependencies, and application libraries. Without scanning integrated into CI, vulnerable images deploy to production undetected. Scanning only at build time misses vulnerabilities discovered after deployment. Ignoring critical findings without documented justification normalizes risk. This reviewer detects gaps in the vulnerability scanning lifecycle -- from build-time scanning through registry and runtime monitoring -- that leave exploitable vulnerabilities in deployed containers.

## Audit Surface

- [ ] CI pipeline without image scan step
- [ ] Image scan step without severity threshold gate
- [ ] Scan configured for OS-only or library-only instead of full scan
- [ ] CRITICAL/HIGH CVEs without acknowledged exception
- [ ] Ignore entries without expiration date or justification
- [ ] Base image using mutable tag making findings unfixable
- [ ] CI scanning only the built image, not base image separately
- [ ] No registry-level scanning configured
- [ ] No runtime scanning agent deployed
- [ ] Scanner vulnerability database not refreshed before scan
- [ ] Scan results not uploaded to dashboard or artifact store
- [ ] Pipeline continues on scan failure

## Detailed Checks

### CI Pipeline Integration
<!-- activation: keywords=["trivy", "grype", "clair", "scan", "image", "pipeline", "workflow", "step", "job", "stage", "github", "gitlab", "jenkins"] -->

- [ ] **No image scanning in CI**: flag CI pipelines that build container images without a vulnerability scanning step -- images deploy to registries and clusters with unknown vulnerabilities; add `trivy image`, `grype`, or equivalent after the image build step
- [ ] **Scan without severity gate**: flag scanning steps that do not fail the pipeline on findings (`--exit-code 1` for Trivy, `--fail-on` for Grype) -- scanning without enforcement is audit theater; the pipeline passes regardless of critical vulnerabilities
- [ ] **Pipeline continues on scan failure**: flag CI configurations with `allow_failure: true` (GitLab), `continue-on-error: true` (GitHub Actions), or equivalent on the scan step -- this negates the enforcement gate; scan failures should block the pipeline
- [ ] **Scanner database not updated**: flag scan steps that do not explicitly refresh the vulnerability database before scanning (`trivy image --download-db-only`, `grype db update`) -- stale databases miss recently published CVEs

### Scan Coverage and Depth
<!-- activation: keywords=["os", "library", "vuln-type", "scanners", "pkg", "language", "pip", "npm", "gem", "maven", "cargo", "go", "nuget"] -->

- [ ] **OS-only scanning**: flag scan configurations that limit scanning to OS packages (`--vuln-type os`) -- language-specific dependencies (npm, pip, Maven, Go, Cargo, NuGet) often contain more exploitable vulnerabilities than OS packages; scan both
- [ ] **Library-only scanning**: flag scan configurations that skip OS packages (`--vuln-type library`) -- OS-level vulnerabilities (OpenSSL, glibc, curl) are frequently exploited; scan both OS and language packages
- [ ] **Base image not scanned separately**: flag pipelines that scan only the final built image without separately scanning the base image -- vulnerabilities in the base image are obscured by the application layers; scanning the base image identifies which findings are fixable by updating the FROM reference
- [ ] **Third-party images not scanned**: flag deployments using third-party images (redis, postgres, nginx) without scanning them -- third-party images accumulate vulnerabilities just like application images; scan all images before deployment

### Finding Management and Exceptions
<!-- activation: keywords=[".trivyignore", ".grype.yaml", "ignore", "exception", "suppress", "whitelist", "allowlist", "CVE-", "GHSA-", "justification", "expiration"] -->

- [ ] **Critical findings without exception**: flag CRITICAL or HIGH severity CVEs in scan results that are not documented in .trivyignore, .grype.yaml, or equivalent exception file -- unacknowledged critical findings indicate either an unpatched vulnerability or a missing triage process
- [ ] **Exception without justification**: flag .trivyignore or .grype.yaml entries without a comment explaining why the CVE is acceptable -- exceptions without justification become permanent risk acceptances that are never revisited
- [ ] **Exception without expiration**: flag ignore entries without an expiration date or review cadence -- exceptions should be time-bounded; a CVE that is unfixable today may have a fix available next month
- [ ] **Unfixable findings on mutable base**: flag scan findings that cannot be fixed because the base image uses a mutable tag (:latest, :stable) -- pin the base to a specific version and update to a version that includes the fix

### Registry and Runtime Scanning
<!-- activation: keywords=["registry", "Harbor", "ECR", "GCR", "ACR", "runtime", "admission", "Falco", "operator", "continuous", "scheduled"] -->

- [ ] **No registry-level scanning**: flag container registries (Harbor, ECR, GCR, ACR) without automatic vulnerability scanning enabled -- new CVEs are published daily; images that were clean at build time may become vulnerable before deployment
- [ ] **No runtime scanning**: flag production clusters without a runtime vulnerability scanning agent (Trivy Operator, Falco, Sysdig) -- runtime scanning detects vulnerabilities in currently running containers, not just images in the registry
- [ ] **Scan results not tracked**: flag scanning setups that only produce console output without uploading results to a dashboard (Trivy Server, Dependency-Track, Grype DB) or artifact store -- without tracking, vulnerability trends are invisible and regression detection is impossible

## Common False Positives

- **Distroless and scratch images**: minimal images may have very few scannable packages. Low scan output does not mean the scanner is misconfigured.
- **Development-only images**: images used only in local development (docker-compose dev targets) may not need CI scanning enforcement. Flag only images that deploy to staging or production.
- **Scanner-specific false positives**: Trivy and Grype occasionally report CVEs for packages that are not actually vulnerable in the specific configuration. Documented exceptions with justification are acceptable.
- **Vendored or compiled dependencies**: statically compiled binaries (Go, Rust) may not be detectable by package-level scanners. This is a scanner limitation, not a configuration gap.
- **Air-gapped environments**: registries in air-gapped environments cannot update vulnerability databases from public sources. Verify an offline database update process exists.

## Severity Guidance

| Finding | Severity |
|---|---|
| No image scanning in CI pipeline for production images | Critical |
| Pipeline continues on scan failure (enforcement bypassed) | Critical |
| CRITICAL CVE in scan output without documented exception | Critical |
| Scan without severity threshold gate (no enforcement) | Important |
| OS-only or library-only scan (incomplete coverage) | Important |
| Exception without justification or expiration | Important |
| No registry-level continuous scanning | Minor |
| Scanner database not refreshed before scan | Minor |
| Scan results not tracked in dashboard | Minor |
| Third-party images not included in scan scope | Minor |

## See Also

- `container-image-hardening` -- image construction checks complementing vulnerability scanning
- `container-sbom-cyclonedx-spdx` -- SBOM generation providing the inventory that scanners check
- `sec-supply-chain-sbom-slsa-sigstore` -- supply chain security including image signing and provenance
- `sec-owasp-a06-vulnerable-components` -- vulnerable component detection beyond container images
- `principle-fail-fast` -- scan gates enforce fail-fast on known vulnerabilities

## Authoritative References

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Grype Documentation](https://github.com/anchore/grype)
- [Clair Documentation](https://quay.github.io/clair/)
- [NIST SP 800-190: Application Container Security Guide](https://csrc.nist.gov/publications/detail/sp/800-190/final)
- [CIS Docker Benchmark: Image Scanning](https://www.cisecurity.org/benchmark/docker)
