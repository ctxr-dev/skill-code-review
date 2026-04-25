---
id: build-earthly
type: primary
depth_role: leaf
focus: Detect Earthly misconfigurations including missing --push flag, secrets in Earthfile, large build contexts, missing cache mounts, and non-reproducible RUN commands
parents:
  - index.md
covers:
  - Missing --push flag on targets that should push artifacts
  - Secrets hardcoded in Earthfile instead of using --secret
  - Large build context transferring unnecessary files
  - Missing cache mounts for package manager caches
  - Non-reproducible RUN commands using timestamps or random values
  - FROM targets not pinned to digest
  - Missing .earthlyignore causing large context transfers
  - SAVE IMAGE without --push in CI
  - Inline secrets in ARG values
tags:
  - earthly
  - earthfile
  - containerized-builds
  - cache
  - secrets
  - reproducibility
  - push
  - ci
activation:
  file_globs:
    - Earthfile
    - .earthlyignore
    - ".earthly/config.yml"
  keyword_matches:
    - FROM
    - SAVE IMAGE
    - SAVE ARTIFACT
    - RUN
    - COPY
    - "--push"
    - "--secret"
    - "--mount"
    - VERSION
    - IMPORT
  structural_signals:
    - earthfile_change
    - build_configuration_change
source:
  origin: file
  path: build-earthly.md
  hash: "sha256:b6f36120566104c70711fab1c43fc4b6a4be3f88d3d45f8f0b42e1d6409f9a9a"
---
# Earthly (Containerized Build System)

## When This Activates

Activates when diffs touch Earthfile, .earthlyignore, or .earthly/config.yml. This reviewer detects Earthly-specific misconfigurations: missing --push flags causing artifacts to not be published in CI, secrets leaked into Earthfile text, large build contexts slowing down builds, missing cache mounts wasting re-download time, and non-reproducible RUN commands that defeat Earthly's caching and determinism guarantees.

## Audit Surface

- [ ] SAVE IMAGE without --push on CI target
- [ ] Hardcoded password, token, or key in Earthfile
- [ ] ARG with default value containing credential or secret
- [ ] Missing .earthlyignore file in project with large non-build assets
- [ ] RUN command using date, random, or UUID for build inputs
- [ ] FROM using mutable tag (:latest, :stable) without digest
- [ ] Missing --mount=type=cache for package manager operations
- [ ] COPY . . without preceding .earthlyignore or selective COPY
- [ ] RUN --no-cache on a step that should be cached
- [ ] LOCALLY target used for production builds
- [ ] Missing VERSION declaration at top of Earthfile
- [ ] IMPORT from remote without version pin
- [ ] SECRET used as ARG fallback value

## Detailed Checks

### Push and Artifact Publication
<!-- activation: keywords=["SAVE IMAGE", "SAVE ARTIFACT", "--push", "SAVE", "AS LOCAL", "ci", "deploy"] -->

- [ ] **Missing --push on SAVE IMAGE**: flag `SAVE IMAGE` in CI-facing targets without `--push` -- without --push, the image is built but not pushed to the registry; CI completes silently without publishing
- [ ] **SAVE ARTIFACT without --push for remote**: flag artifact-saving targets intended for remote storage that lack `--push` -- artifacts exist only in the local Earthly cache and are lost when CI completes
- [ ] **Missing SAVE IMAGE entirely**: flag CI targets that build a container but never issue `SAVE IMAGE` -- the built image cannot be referenced or deployed
- [ ] **LOCALLY for production builds**: flag targets using `LOCALLY` for production build steps -- LOCALLY bypasses containerization and runs on the host, breaking hermeticity

### Secret Management
<!-- activation: keywords=["secret", "SECRET", "ARG", "password", "token", "key", "api_key", "AWS_", "credential", "--secret"] -->

- [ ] **Hardcoded secret in Earthfile**: flag passwords, tokens, API keys, or credentials appearing as literal strings in Earthfile RUN or ENV commands -- use `RUN --secret` to inject secrets at build time without baking them into layers
- [ ] **ARG with secret default**: flag `ARG MY_TOKEN=sk-live-abc123` or similar -- ARG default values are visible in build metadata and logs; use `--secret` instead
- [ ] **SECRET as ARG fallback**: flag patterns like `ARG token=$(cat /run/secrets/...)` that expose secrets via ARG -- secrets accessed via `--secret` are available only during the RUN that requests them
- [ ] **ENV with secret value**: flag `ENV API_KEY=...` with actual credential values -- ENV values persist in the image layers and are visible to anyone who pulls the image

### Build Context and Performance
<!-- activation: keywords=["COPY", ".earthlyignore", "context", "cache", "--mount=type=cache"] -->

- [ ] **COPY . . without .earthlyignore**: flag `COPY . .` in projects without a `.earthlyignore` file -- the entire project directory (including .git, node_modules, build artifacts) is transferred to the build context, slowing builds
- [ ] **Missing cache mount for package managers**: flag `RUN npm install`, `RUN pip install`, `RUN go build` without `--mount=type=cache,target=...` for the package manager cache directory -- every build re-downloads all packages instead of using the cache
- [ ] **Large file in build context**: flag COPY commands transferring large binary files, datasets, or media that are not needed for the build -- exclude them via .earthlyignore or use selective COPY
- [ ] **RUN --no-cache misuse**: flag `RUN --no-cache` on steps that are deterministic and should benefit from caching -- --no-cache should be reserved for steps that genuinely produce non-deterministic output

### Reproducibility
<!-- activation: keywords=["FROM", "VERSION", "IMPORT", "date", "random", "uuid", "timestamp", "digest", "latest"] -->

- [ ] **Missing VERSION declaration**: flag Earthfile without `VERSION` at the top -- the VERSION command specifies which Earthly features and syntax to use; omitting it allows behavior changes across Earthly upgrades
- [ ] **FROM with mutable tag**: flag `FROM docker.io/library/node:18` or `:latest` without a digest pin -- mutable tags produce different images on different days; pin with `@sha256:...`
- [ ] **IMPORT without version pin**: flag `IMPORT github.com/org/repo` without a tag or commit reference -- the imported Earthfile can change between builds
- [ ] **Non-reproducible RUN**: flag RUN commands that embed `$(date)`, `$(uuidgen)`, `$RANDOM`, or timestamps into build outputs -- these produce different results on each run, defeating caching and reproducibility

## Common False Positives

- **LOCALLY for developer convenience**: LOCALLY targets intended for local development workflows (running tests on host, IDE integration) are appropriate. Flag only when LOCALLY is used in CI or production builds.
- **--no-cache for version stamping**: a single `RUN --no-cache` to stamp a build version or git SHA is standard practice. Flag only when --no-cache is used broadly.
- **Missing --push in development targets**: targets used only for local development do not need --push. Flag only when the target is referenced in CI.
- **ARG for non-sensitive configuration**: ARGs with default values for non-secret configuration (build type, target architecture) are appropriate.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secret (password, token, key) in Earthfile | Critical |
| ENV with credential value persisted in image layer | Critical |
| Missing --push on CI target causing silent publish failure | Important |
| FROM with mutable tag without digest pin | Important |
| LOCALLY used for production builds | Important |
| IMPORT from remote without version pin | Important |
| Missing .earthlyignore with COPY . . | Minor |
| Missing cache mount for package manager | Minor |
| Missing VERSION declaration | Minor |
| Non-reproducible RUN with date/random | Minor |

## See Also

- `build-reproducibility-slsa-sigstore` -- reproducible build requirements applicable to Earthly
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for Earthly-built images
- `build-lockfile-hygiene` -- lockfile checks for packages installed during Earthly builds
- `sec-owasp-a06-vulnerable-components` -- vulnerable base images and dependencies

## Authoritative References

- [Earthly Documentation: Earthfile Reference](https://docs.earthly.dev/docs/earthfile)
- [Earthly Documentation: Managing Secrets](https://docs.earthly.dev/docs/guides/secrets)
- [Earthly Documentation: Caching](https://docs.earthly.dev/docs/guides/caching)
- [Earthly Documentation: CI Integration](https://docs.earthly.dev/docs/guides/ci-integration)
