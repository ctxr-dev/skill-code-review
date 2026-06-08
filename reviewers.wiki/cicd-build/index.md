---
id: cicd-build
type: index
depth_role: subcategory
depth: 1
focus: "cicd-build: Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts; Detect Bundler misconfigurati..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - activity
  - affected
  - akamai
  - approval-gate
  - architecture
  - argo-workflows
  - artifacts
  - attestation
  - attribution
  - author-discipline
  - autoload
  - automation
  - azure-devops
  - background-jobs
  - bazel
  - beam
  - binary
  - blue-green
  - bom
  - branch-protection
generator: "skill-llm-wiki/v1"
entries:
  - id: build-bazel-buck-pants
    file: build-bazel-buck-pants.md
    type: primary
    focus: Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts
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
  - id: build-bundler
    file: build-bundler.md
    type: primary
    focus: Detect Bundler misconfigurations including missing Gemfile.lock, unpinned gem versions, git source gems without ref pinning, platform-specific gem omissions, and missing Ruby version requirements
    tags:
      - bundler
      - ruby
      - gems
      - gemfile
      - lockfile
      - rubygems
      - platform
      - pinning
      - dependencies
  - id: build-cargo
    file: build-cargo.md
    type: primary
    focus: Detect Cargo misconfigurations including missing Cargo.lock in binary crates, wildcard dependencies, unsafe build scripts, missing edition declaration, and undocumented features
    tags:
      - cargo
      - rust
      - crate
      - lockfile
      - build-rs
      - edition
      - msrv
      - features
      - unsafe
      - dependencies
  - id: build-composer
    file: build-composer.md
    type: primary
    focus: Detect Composer misconfigurations including missing composer.lock, wildcard versions, scripts with shell commands, missing platform config, and dev dependencies in production autoload
    tags:
      - composer
      - php
      - packagist
      - lockfile
      - autoload
      - platform
      - dependencies
      - scripts
  - id: build-earthly
    file: build-earthly.md
    type: primary
    focus: Detect Earthly misconfigurations including missing --push flag, secrets in Earthfile, large build contexts, missing cache mounts, and non-reproducible RUN commands
    tags:
      - earthly
      - earthfile
      - containerized-builds
      - cache
      - secrets
      - reproducibility
      - push
      - ci
  - id: build-go-modules
    file: build-go-modules.md
    type: primary
    focus: Detect Go module misconfigurations including missing go.sum, committed replace directives, missing toolchain directive, vendor directory inconsistencies, and untidied indirect dependencies
    tags:
      - go
      - modules
      - go-mod
      - go-sum
      - vendor
      - replace
      - toolchain
      - checksum
      - dependencies
  - id: build-lockfile-hygiene
    file: build-lockfile-hygiene.md
    type: primary
    focus: Detect lockfile mismanagement across all package managers including uncommitted lockfiles, out-of-sync lockfiles, unreviewed lockfile diffs, missing integrity hashes, and improperly resolved merge conflicts
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
  - id: build-maven-gradle
    file: build-maven-gradle.md
    type: primary
    focus: Detect Maven and Gradle misconfigurations including missing dependency locking, SNAPSHOT dependencies in releases, missing BOM alignment, build scan credential exposure, and absent enforcer rules
    tags:
      - maven
      - gradle
      - jvm
      - pom
      - dependency-management
      - lockfile
      - snapshot
      - bom
      - enforcer
      - wrapper
  - id: build-mix-elixir
    file: build-mix-elixir.md
    type: primary
    focus: "Detect Mix misconfigurations including missing mix.lock, git dependencies without ref pinning, missing :only for dev/test deps, and absent compilation warnings-as-errors"
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
  - id: build-npm-yarn-pnpm-bun
    file: build-npm-yarn-pnpm-bun.md
    type: primary
    focus: Detect misconfigurations in Node.js package managers including missing lockfiles, wildcard versions, unreviewed lifecycle scripts, registry misconfigurations, and production bundle bloat
    tags:
      - npm
      - yarn
      - pnpm
      - bun
      - node
      - package-manager
      - lockfile
      - lifecycle-scripts
      - registry
      - dependencies
  - id: build-nuget
    file: build-nuget.md
    type: primary
    focus: Detect NuGet misconfigurations including missing packages.lock.json, floating versions, unpinned package sources, deprecated packages, and suppressed NU analyzer warnings
    tags:
      - nuget
      - dotnet
      - csharp
      - fsharp
      - packages
      - lockfile
      - cpm
      - package-source
      - dependencies
  - id: build-nx-turbo-lerna-rush-lage
    file: build-nx-turbo-lerna-rush-lage.md
    type: primary
    focus: Detect monorepo orchestration misconfigurations including cache invalidation errors, task graph cycles, missing affected calculation, overly broad inputs, and workspace protocol misuse
    tags:
      - nx
      - turborepo
      - turbo
      - lerna
      - rush
      - lage
      - monorepo
      - cache
      - task-graph
      - workspace
      - affected
  - id: build-pip-poetry-uv-pdm-rye
    file: build-pip-poetry-uv-pdm-rye.md
    type: primary
    focus: Detect misconfigurations in Python package managers including unpinned dependencies, missing hash verification, editable installs in production, and build isolation issues
    tags:
      - pip
      - poetry
      - uv
      - pdm
      - rye
      - python
      - package-manager
      - lockfile
      - hashes
      - virtualenv
      - dependencies
  - id: build-reproducibility-slsa-sigstore
    file: build-reproducibility-slsa-sigstore.md
    type: primary
    focus: Detect non-reproducible build patterns, missing provenance attestation, absent SLSA compliance measures, unsigned artifacts, and missing build attestation
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
  - id: build-swiftpm-cocoapods
    file: build-swiftpm-cocoapods.md
    type: primary
    focus: Detect Swift Package Manager and CocoaPods misconfigurations including uncommitted resolution files, unpinned pod versions, missing platform requirements, and large binary dependencies
    tags:
      - swift
      - swiftpm
      - cocoapods
      - ios
      - macos
      - package-resolved
      - podfile
      - xcframework
      - dependencies
  - id: build-vendored-toolchain
    file: build-vendored-toolchain.md
    type: primary
    focus: Detect vendored dependency and toolchain issues including stale vendored code, unpinned toolchain versions, missing checksums for vendored binaries, and unattributed vendored source
    tags:
      - vendor
      - vendored
      - toolchain
      - pinning
      - checksum
      - attribution
      - third-party
      - binary
      - dependencies
  - id: ci-green-precondition
    file: ci-green-precondition.md
    type: primary
    focus: "Gate reviewer that refuses to dispatch expensive reviewers when automated CI checks (lint, type, test, SAST, build) are red"
    tags:
      - ci
      - gate
      - lint
      - tests
      - sast
      - build
      - pre-dispatch
      - automation
  - id: cicd-argo-workflows
    file: cicd-argo-workflows.md
    type: primary
    focus: Detect Argo Workflows security and reliability issues including missing RBAC on workflow templates, secrets in workflow specs, absent artifact garbage collection, missing resource limits, and retry without backoff
    tags:
      - argo-workflows
      - ci-cd
      - kubernetes
      - workflow
      - rbac
      - artifacts
      - retry
      - resource-limits
      - CWE-798
      - CWE-269
      - background-jobs
      - sidekiq
      - celery
      - bullmq
      - hangfire
      - temporal
      - queues
      - idempotency
      - dlq
      - cron
      - cadence
      - activity
      - determinism
      - versioning
      - architecture
  - id: cicd-buildkite-drone-tekton
    file: cicd-buildkite-drone-tekton.md
    type: primary
    focus: Detect Buildkite, Drone, and Tekton pipeline security and reliability issues including unpinned plugins, secrets in config, missing timeouts, and insufficient step isolation
    tags:
      - buildkite
      - drone
      - tekton
      - ci-cd
      - pipeline
      - plugins
      - secrets
      - timeout
      - CWE-829
      - CWE-798
  - id: cicd-caching-strategy
    file: cicd-caching-strategy.md
    type: primary
    focus: "Detect CI/CD caching issues including overly broad cache keys, cache poisoning risks, missing lockfile-based invalidation, cross-PR cache security, and missing compression"
    tags:
      - caching
      - ci-cd
      - performance
      - security
      - cache-poisoning
      - dependencies
      - CWE-345
      - cache
      - TTL
      - eviction
      - stampede
      - invalidation
      - stale-data
      - correctness
      - cdn
      - cloudflare
      - fastly
      - cloudfront
      - akamai
      - edge
      - ttl
      - vary
      - purge
      - origin-shield
      - vcl
      - workers
      - edge-computing
      - CDN
      - edge-function
      - stale
      - fallback
      - architecture
  - id: cicd-circleci
    file: cicd-circleci.md
    type: primary
    focus: Detect CircleCI security and reliability issues including unpinned orbs, secrets in config, missing context restrictions, improper parallelism, wrong resource classes, and missing workspace persistence
    tags:
      - circleci
      - ci-cd
      - orbs
      - pipeline
      - secrets
      - parallelism
      - CWE-829
      - CWE-798
  - id: cicd-deploy-strategies
    file: cicd-deploy-strategies.md
    type: primary
    focus: Detect deployment strategy issues including big-bang deploys without progressive rollout, canary without metrics comparison, missing rollback triggers, stale feature flags, deploys without smoke tests, and missing deploy freeze mechanisms
    tags:
      - deployment
      - ci-cd
      - canary
      - blue-green
      - rolling
      - rollback
      - feature-flags
      - smoke-test
      - deployability
      - health-check
      - graceful-shutdown
      - migration
      - progressive-delivery
      - configuration
  - id: cicd-github-actions
    file: cicd-github-actions.md
    type: primary
    focus: Detect GitHub Actions security and reliability issues including unpinned actions, secrets exposure, excessive permissions, pull_request_target dangers, and missing concurrency controls
    tags:
      - github-actions
      - ci-cd
      - workflow
      - supply-chain
      - secrets
      - permissions
      - CWE-829
      - CWE-798
  - id: cicd-jenkins
    file: cicd-jenkins.md
    type: primary
    focus: Detect Jenkins pipeline security and reliability issues including script blocks in declarative pipelines, credentials in pipeline code, unpinned shared libraries, overly broad agent labels, missing timeouts, and missing retry on flaky stages
    tags:
      - jenkins
      - ci-cd
      - pipeline
      - jenkinsfile
      - groovy
      - credentials
      - shared-library
      - CWE-798
      - CWE-269
      - azure-devops
      - service-connection
      - variable-group
      - approval-gate
  - id: cicd-merge-queue-and-branch-protection
    file: cicd-merge-queue-and-branch-protection.md
    type: primary
    focus: Detect branch protection and merge queue issues including unprotected main branches, missing required reviews, missing status checks, allowed force push, absent merge queue for high-traffic repos, and missing signed commits
    tags:
      - branch-protection
      - merge-queue
      - code-review
      - ci-cd
      - git
      - governance
      - signed-commits
  - id: cicd-test-parallelization-and-flaky-quarantine
    file: cicd-test-parallelization-and-flaky-quarantine.md
    type: primary
    focus: Detect CI test execution issues including uneven test splitting, missing flaky test quarantine, retries masking real failures, absent timing data for splitting, and missing flaky detection automation
    tags:
      - testing
      - ci-cd
      - parallelism
      - flaky-tests
      - quarantine
      - test-splitting
      - performance
  - id: pr-description-quality
    file: pr-description-quality.md
    type: primary
    focus: Enforce that PR descriptions are present, non-trivial, and helpful for reviewers by explaining what changed, why, and how to verify
    tags:
      - pr-description
      - documentation
      - process
      - review-hygiene
      - pull-request
      - author-discipline
  - id: pr-size-and-single-purpose
    file: pr-size-and-single-purpose.md
    type: primary
    focus: Detect pull requests that are too large to review effectively or that mix unrelated concerns, reducing review quality and increasing merge risk
    tags:
      - pr-size
      - single-responsibility
      - review-quality
      - code-review
      - process
      - architecture
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Cicd Build

**Focus:** cicd-build: Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts; Detect Bundler misconfigurati...

## Children

| File | Type | Focus |
|------|------|-------|
| [build-bazel-buck-pants.md](build-bazel-buck-pants.md) | 📄 primary | Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts |
| [build-bundler.md](build-bundler.md) | 📄 primary | Detect Bundler misconfigurations including missing Gemfile.lock, unpinned gem versions, git source gems without ref pinning, platform-specific gem omissions, and missing Ruby version requirements |
| [build-cargo.md](build-cargo.md) | 📄 primary | Detect Cargo misconfigurations including missing Cargo.lock in binary crates, wildcard dependencies, unsafe build scripts, missing edition declaration, and undocumented features |
| [build-composer.md](build-composer.md) | 📄 primary | Detect Composer misconfigurations including missing composer.lock, wildcard versions, scripts with shell commands, missing platform config, and dev dependencies in production autoload |
| [build-earthly.md](build-earthly.md) | 📄 primary | Detect Earthly misconfigurations including missing --push flag, secrets in Earthfile, large build contexts, missing cache mounts, and non-reproducible RUN commands |
| [build-go-modules.md](build-go-modules.md) | 📄 primary | Detect Go module misconfigurations including missing go.sum, committed replace directives, missing toolchain directive, vendor directory inconsistencies, and untidied indirect dependencies |
| [build-lockfile-hygiene.md](build-lockfile-hygiene.md) | 📄 primary | Detect lockfile mismanagement across all package managers including uncommitted lockfiles, out-of-sync lockfiles, unreviewed lockfile diffs, missing integrity hashes, and improperly resolved merge conflicts |
| [build-maven-gradle.md](build-maven-gradle.md) | 📄 primary | Detect Maven and Gradle misconfigurations including missing dependency locking, SNAPSHOT dependencies in releases, missing BOM alignment, build scan credential exposure, and absent enforcer rules |
| [build-mix-elixir.md](build-mix-elixir.md) | 📄 primary | Detect Mix misconfigurations including missing mix.lock, git dependencies without ref pinning, missing :only for dev/test deps, and absent compilation warnings-as-errors |
| [build-npm-yarn-pnpm-bun.md](build-npm-yarn-pnpm-bun.md) | 📄 primary | Detect misconfigurations in Node.js package managers including missing lockfiles, wildcard versions, unreviewed lifecycle scripts, registry misconfigurations, and production bundle bloat |
| [build-nuget.md](build-nuget.md) | 📄 primary | Detect NuGet misconfigurations including missing packages.lock.json, floating versions, unpinned package sources, deprecated packages, and suppressed NU analyzer warnings |
| [build-nx-turbo-lerna-rush-lage.md](build-nx-turbo-lerna-rush-lage.md) | 📄 primary | Detect monorepo orchestration misconfigurations including cache invalidation errors, task graph cycles, missing affected calculation, overly broad inputs, and workspace protocol misuse |
| [build-pip-poetry-uv-pdm-rye.md](build-pip-poetry-uv-pdm-rye.md) | 📄 primary | Detect misconfigurations in Python package managers including unpinned dependencies, missing hash verification, editable installs in production, and build isolation issues |
| [build-reproducibility-slsa-sigstore.md](build-reproducibility-slsa-sigstore.md) | 📄 primary | Detect non-reproducible build patterns, missing provenance attestation, absent SLSA compliance measures, unsigned artifacts, and missing build attestation |
| [build-swiftpm-cocoapods.md](build-swiftpm-cocoapods.md) | 📄 primary | Detect Swift Package Manager and CocoaPods misconfigurations including uncommitted resolution files, unpinned pod versions, missing platform requirements, and large binary dependencies |
| [build-vendored-toolchain.md](build-vendored-toolchain.md) | 📄 primary | Detect vendored dependency and toolchain issues including stale vendored code, unpinned toolchain versions, missing checksums for vendored binaries, and unattributed vendored source |
| [ci-green-precondition.md](ci-green-precondition.md) | 📄 primary | Gate reviewer that refuses to dispatch expensive reviewers when automated CI checks (lint, type, test, SAST, build) are red |
| [cicd-argo-workflows.md](cicd-argo-workflows.md) | 📄 primary | Detect Argo Workflows security and reliability issues including missing RBAC on workflow templates, secrets in workflow specs, absent artifact garbage collection, missing resource limits, and retry without backoff |
| [cicd-buildkite-drone-tekton.md](cicd-buildkite-drone-tekton.md) | 📄 primary | Detect Buildkite, Drone, and Tekton pipeline security and reliability issues including unpinned plugins, secrets in config, missing timeouts, and insufficient step isolation |
| [cicd-caching-strategy.md](cicd-caching-strategy.md) | 📄 primary | Detect CI/CD caching issues including overly broad cache keys, cache poisoning risks, missing lockfile-based invalidation, cross-PR cache security, and missing compression |
| [cicd-circleci.md](cicd-circleci.md) | 📄 primary | Detect CircleCI security and reliability issues including unpinned orbs, secrets in config, missing context restrictions, improper parallelism, wrong resource classes, and missing workspace persistence |
| [cicd-deploy-strategies.md](cicd-deploy-strategies.md) | 📄 primary | Detect deployment strategy issues including big-bang deploys without progressive rollout, canary without metrics comparison, missing rollback triggers, stale feature flags, deploys without smoke tests, and missing deploy freeze mechanisms |
| [cicd-github-actions.md](cicd-github-actions.md) | 📄 primary | Detect GitHub Actions security and reliability issues including unpinned actions, secrets exposure, excessive permissions, pull_request_target dangers, and missing concurrency controls |
| [cicd-jenkins.md](cicd-jenkins.md) | 📄 primary | Detect Jenkins pipeline security and reliability issues including script blocks in declarative pipelines, credentials in pipeline code, unpinned shared libraries, overly broad agent labels, missing timeouts, and missing retry on flaky stages |
| [cicd-merge-queue-and-branch-protection.md](cicd-merge-queue-and-branch-protection.md) | 📄 primary | Detect branch protection and merge queue issues including unprotected main branches, missing required reviews, missing status checks, allowed force push, absent merge queue for high-traffic repos, and missing signed commits |
| [cicd-test-parallelization-and-flaky-quarantine.md](cicd-test-parallelization-and-flaky-quarantine.md) | 📄 primary | Detect CI test execution issues including uneven test splitting, missing flaky test quarantine, retries masking real failures, absent timing data for splitting, and missing flaky detection automation |
| [pr-description-quality.md](pr-description-quality.md) | 📄 primary | Enforce that PR descriptions are present, non-trivial, and helpful for reviewers by explaining what changed, why, and how to verify |
| [pr-size-and-single-purpose.md](pr-size-and-single-purpose.md) | 📄 primary | Detect pull requests that are too large to review effectively or that mix unrelated concerns, reducing review quality and increasing merge risk |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
