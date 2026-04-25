---
id: container-image-hardening
type: primary
depth_role: leaf
focus: Detect container image security and hygiene issues including running as root, unpinned base images, missing multi-stage builds, secrets in layers, and unnecessary packages
parents:
  - index.md
covers:
  - Running as root -- no USER directive sets non-root user
  - Base image not pinned by digest -- mutable tag allows silent replacement
  - "Using :latest tag -- non-reproducible builds"
  - Missing multi-stage build -- build tools and compilers in final image
  - Secrets in build args or environment variables -- visible in image history
  - ADD instead of COPY -- ADD extracts tarballs and fetches URLs implicitly
  - Missing .dockerignore -- build context includes .git, node_modules, secrets
  - Installing unnecessary packages -- larger attack surface
  - Not cleaning package manager cache -- bloated image layers
  - Missing HEALTHCHECK instruction
  - COPY . . including sensitive files without .dockerignore
tags:
  - container
  - docker
  - dockerfile
  - image
  - security
  - hardening
  - multi-stage
  - root
  - digest
  - CWE-250
activation:
  file_globs:
    - "**/Dockerfile*"
    - "**/Containerfile*"
    - "**/.dockerignore"
  keyword_matches:
    - FROM
    - RUN
    - COPY
    - ADD
    - USER
    - EXPOSE
    - ENTRYPOINT
    - CMD
    - WORKDIR
    - apt-get
    - apk
    - yum
    - pip install
source:
  origin: file
  path: container-image-hardening.md
  hash: "sha256:ff2c3cd0999355b921317579192b240fbcfa81f55a471fac364c3f64ddab20d4"
---
# Container Image Hardening

## When This Activates

Activates on diffs touching Dockerfiles, Containerfiles, or .dockerignore files. Container images are the unit of deployment in modern infrastructure, and insecure image construction creates vulnerabilities that propagate to every environment the image runs in. Running as root gives attackers kernel exploit paths, unpinned base images allow silent supply chain compromise, build secrets baked into layers persist in image history forever, and missing multi-stage builds ship compilers and debug tools to production. This reviewer detects image construction pitfalls that weaken the security posture of every container instance.

## Audit Surface

- [ ] Dockerfile without USER directive (runs as root)
- [ ] FROM instruction using :latest tag
- [ ] FROM instruction without @sha256 digest pin
- [ ] Single-stage Dockerfile with build tools in final image
- [ ] ARG or ENV containing password, secret, token, or key
- [ ] ADD instruction where COPY would suffice
- [ ] Repository without .dockerignore file
- [ ] .dockerignore missing .git, .env, or node_modules entries
- [ ] RUN install without cache cleanup in same layer
- [ ] RUN pip install without --no-cache-dir flag
- [ ] Dockerfile without HEALTHCHECK instruction
- [ ] COPY . . without .dockerignore review
- [ ] RUN with curl/wget piped to shell
- [ ] Multiple RUN instructions that should be combined
- [ ] Missing --no-install-recommends on apt-get install

## Detailed Checks

### User and Privilege
<!-- activation: keywords=["USER", "root", "nonroot", "nobody", "uid", "gid", "gosu", "su-exec", "chown", "chmod"] -->

- [ ] **Running as root**: flag Dockerfiles without a `USER` directive -- containers default to running as root (UID 0), which grants the process full privileges within the container and enables kernel exploit container escape (CVE-2019-5736, CVE-2024-21626)
- [ ] **USER set too early**: flag `USER nonroot` placed before `RUN` commands that need root (package installs, file ownership changes) -- the non-root user cannot execute privileged operations; set USER as one of the last instructions
- [ ] **USER directive uses name without numeric UID**: flag `USER appuser` without a numeric UID -- the username may not exist in the container, or may map to a different UID across base images; prefer `USER 1001:1001` for consistency

### Base Image Pinning
<!-- activation: keywords=["FROM", "AS", "latest", "sha256", "digest", "alpine", "distroless", "scratch", "slim", "bullseye", "bookworm"] -->

- [ ] **Using :latest tag**: flag `FROM image:latest` or `FROM image` without tag -- :latest is mutable and different builds resolve to different images; this produces non-reproducible builds that behave differently across environments
- [ ] **Mutable tag without digest**: flag FROM instructions using version tags (`:3.19`, `:22.04`) without `@sha256:` digest -- tags can be overwritten in the registry; only digest pinning guarantees the exact base image binary across all builds
- [ ] **Non-minimal base image**: flag FROM instructions using full OS images (ubuntu, debian, centos) when distroless or alpine alternatives exist -- full images contain hundreds of unnecessary packages (shells, editors, network tools) that expand the attack surface
- [ ] **Build stage base unpinned**: flag multi-stage build where the builder stage uses an unpinned base image -- even though build tools are not in the final image, a compromised builder base can inject malicious code during compilation

### Multi-Stage Builds and Layer Hygiene
<!-- activation: keywords=["COPY --from", "AS builder", "AS build", "multi-stage", "gcc", "make", "maven", "gradle", "npm", "yarn", "go build", "cargo build"] -->

- [ ] **Missing multi-stage build**: flag single-stage Dockerfiles that install build tools (gcc, make, maven, gradle, npm/yarn dev dependencies, go toolchain, cargo) -- build tools in the final image increase size by hundreds of megabytes and provide attackers with compilers and debug utilities
- [ ] **COPY --from referencing wrong stage**: flag `COPY --from=` that references a stage name or index that does not exist in the Dockerfile -- this causes a build failure or silently copies from a published image instead of the intended build stage
- [ ] **Excessive layer count**: flag Dockerfiles with more than 5 separate `RUN` instructions that could be combined -- each RUN creates a layer; combine related commands with `&&` to reduce image size and layer count
- [ ] **Cache not cleaned in same layer**: flag `RUN apt-get install` or `apk add` without `rm -rf /var/cache/apt/*` or `--no-cache` in the same RUN instruction -- package manager caches persist in the layer even if removed in a subsequent RUN

### Secrets and Sensitive Data
<!-- activation: keywords=["ARG", "ENV", "SECRET", "secret", "password", "token", "key", "credential", "api_key", "AWS_", "DOCKER_BUILDKIT", "--secret", "--mount=type=secret"] -->

- [ ] **Secrets in ARG or ENV**: flag ARG or ENV instructions with names suggesting secrets (password, secret, token, key, api_key, credential, AWS_SECRET) -- ARG values are visible in `docker history` and ENV values persist in the running container's environment; use `--mount=type=secret` with BuildKit instead
- [ ] **Secrets fetched during build without BuildKit secrets**: flag `RUN` instructions that download credentials or copy secret files without using `--mount=type=secret` -- the secret is baked into the image layer permanently and visible to anyone with image pull access
- [ ] **COPY of secret files**: flag `COPY` instructions that copy .env, credentials.json, *.pem, or*.key files into the image -- even if deleted in a later layer, the file remains in the earlier layer accessible via `docker save`

### Build Context and COPY Hygiene
<!-- activation: keywords=["COPY", "ADD", ".dockerignore", "COPY . .", "context", ".git", "node_modules", ".env"] -->

- [ ] **Missing .dockerignore**: flag repositories with a Dockerfile but no .dockerignore file -- the entire build context is sent to the Docker daemon, including .git (repository history), node_modules (hundreds of MB), .env (secrets), and test fixtures
- [ ] **ADD instead of COPY**: flag `ADD` instructions that copy local files -- ADD has implicit behavior (auto-extracts tarballs, fetches URLs) that is surprising and creates a larger attack surface; use COPY for local files and explicit RUN curl for downloads
- [ ] **.dockerignore incomplete**: flag .dockerignore that is missing entries for .git, .env, node_modules, **pycache**, .idea, .vscode, or *.log -- these inflate the build context and may leak sensitive data into the image
- [ ] **COPY . . as first instruction**: flag `COPY . .` before dependency install steps -- this invalidates the Docker layer cache on every source change; copy dependency manifests first, install dependencies, then copy source

## Common False Positives

- **Development Dockerfiles**: local development Dockerfiles may intentionally use :latest, run as root, and skip multi-stage builds for convenience. Flag only Dockerfiles in production paths (deploy/, .github/workflows, CI config).
- **Base image builders**: Dockerfiles that build base images for internal use legitimately install many packages and may not have a USER directive if the consuming Dockerfile sets it.
- **Distroless images**: distroless images already run as non-root and have a read-only filesystem. The absence of USER in a `FROM gcr.io/distroless/*` context is not a finding.
- **Scratch-based images**: `FROM scratch` images have no shell, no package manager, and no users file. USER directive, HEALTHCHECK, and package cleanup checks do not apply.
- **BuildKit features**: Dockerfiles using BuildKit secrets (`--mount=type=secret`) may appear to use secrets in RUN instructions but are actually secure. Check for the `--mount` flag before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secrets baked into image layers (ARG/ENV/COPY) | Critical |
| Running as root in production image | Critical |
| Base image using :latest tag in production | Important |
| Missing .dockerignore with .env or credentials in context | Important |
| ADD used where COPY suffices (implicit URL fetch) | Important |
| Missing multi-stage build (build tools in final image) | Important |
| Base image not pinned by digest | Minor |
| Missing HEALTHCHECK instruction | Minor |
| Package cache not cleaned in same RUN layer | Minor |
| Excessive RUN layers (>5 combinable) | Minor |
| Missing --no-install-recommends on apt-get | Minor |

## See Also

- `k8s-manifest-correctness` -- image tag and pull policy checks in Kubernetes manifests
- `k8s-pod-security-standards` -- runtime security context complementing image hardening
- `sec-supply-chain-sbom-slsa-sigstore` -- image provenance and signing
- `container-image-scanning-trivy-grype-clair` -- vulnerability scanning of built images
- `container-sbom-cyclonedx-spdx` -- SBOM generation for image contents
- `sec-owasp-a05-misconfiguration` -- Dockerfile misconfigurations as security misconfiguration

## Authoritative References

- [Docker Documentation: Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [CIS Docker Benchmark v1.6](https://www.cisecurity.org/benchmark/docker)
- [Google Distroless Images](https://github.com/GoogleContainerTools/distroless)
- [Docker Documentation: BuildKit Secrets](https://docs.docker.com/build/building/secrets/)
- [Hadolint Rules Reference](https://github.com/hadolint/hadolint#rules)
