---
id: cicd-caching-strategy
type: primary
depth_role: leaf
focus: "Detect CI/CD caching issues including overly broad cache keys, cache poisoning risks, missing lockfile-based invalidation, cross-PR cache security, and missing compression"
parents:
  - index.md
covers:
  - "Cache key too broad (stale dependencies served across unrelated changes)"
  - Cache poisoning risk from untrusted branch or PR caches
  - Cache not invalidated when lockfile changes
  - "Build output cached across PRs (security risk from malicious PR)"
  - Missing cache compression increasing storage and transfer time
  - Cache restore without fallback key strategy
  - "Caching node_modules instead of npm/yarn cache directory"
  - Cache key collision between different OS or architecture
  - Secrets or credentials stored in cache entries
  - Cache not scoped to workflow or pipeline
  - "Missing cache for repeated expensive computation or I/O"
  - "Cache without TTL or eviction policy (unbounded growth)"
  - "Cache stampede / thundering herd on expiration"
  - Cache key collisions due to weak or incomplete key construction
  - Stale cache serving wrong data after underlying data changes
  - Cache invalidation missing or inconsistent across replicas
  - Cache warm-up not implemented for cold-start scenarios
  - "Cache penetration -- uncacheable results (nulls, errors) not handled"
  - Write-through vs write-behind mismatch with consistency requirements
  - Local in-process cache diverging from shared cache in multi-instance deployments
  - Cache key including user-specific or session data causing poisoning or miss explosion
  - Missing Vary header for content that varies by accept-encoding, language, or device
  - TTL too short causing origin overload, or too long causing stale content
  - No cache purge strategy on content invalidation
  - Origin shield not configured leaving origin exposed to fan-out
  - Cache bypass via arbitrary query string parameters
  - "Missing compression (gzip/brotli) at edge"
  - "Missing Cache-Control: private for user-personalized responses"
  - Missing stale-while-revalidate for resilience to origin blips
  - HTTPS not enforced at edge allowing downgrade
  - Cookies forwarded to cache key leaking private data across users
  - "Edge worker / VCL / Lambda@Edge mutating headers without cache-key alignment"
  - Edge cache serving stale data with no invalidation strategy or TTL
  - Edge function performing computation that requires strongly consistent state
  - Missing fallback when edge location is unreachable or cache is cold
  - Edge function exceeding size or execution time limits
  - Sensitive data cached at edge without encryption or access controls
  - Edge logic diverging from origin logic without synchronization
  - No observability at the edge -- errors invisible to central monitoring
  - Edge function making synchronous calls back to origin for every request
  - Missing cache key strategy causing cache pollution or low hit rates
  - Edge configuration not tested for regional consistency
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
aliases:
  - perf-caching-strategy
  - cdn-discipline-cloudflare-fastly-cloudfront
  - arch-edge-computing
activation:
  file_globs:
    - "**/.github/workflows/*"
    - "**/.gitlab-ci*"
    - "**/.circleci/**"
    - "**/.buildkite/**"
    - "**/azure-pipelines*"
    - "**/Jenkinsfile*"
  keyword_matches:
    - cache
    - "actions/cache"
    - save_cache
    - restore_cache
    - "cache:"
    - "key:"
    - restore-keys
    - hashFiles
    - node_modules
    - vendor
    - .npm
    - .yarn
    - pip-cache
  structural_signals:
    - CI cache configuration change
    - Cache key or restore strategy change
source:
  origin: file
  path: cicd-caching-strategy.md
  hash: "sha256:236fc9d003cdf637d7493e35dbfabbee90c52ce9a5c337caeaf3682f21242adf"
---
# CI/CD Caching Strategy

## When This Activates

Activates when diffs touch CI/CD configuration files containing cache definitions. Effective caching accelerates builds by reusing dependency downloads and build artifacts between runs. However, misconfigured caches serve stale dependencies, create supply chain attack vectors when untrusted PRs can poison the cache for main-branch builds, and waste storage when cache keys are too broad or lack invalidation. This reviewer detects caching patterns that degrade build correctness, create security risks, or miss performance opportunities.

## Audit Surface

- [ ] Cache key using only branch name without lockfile hash
- [ ] Cache shared between PRs and main branch without isolation
- [ ] Lockfile not included in cache key hash
- [ ] Build artifacts cached and reused across untrusted PRs
- [ ] node_modules or vendor directory cached instead of package manager cache
- [ ] Cache key missing OS or architecture qualifier
- [ ] No fallback restore-keys for partial cache hit
- [ ] Cache entry containing credentials or token files
- [ ] Cache size unbounded (no eviction or TTL)
- [ ] Dependency cache without integrity verification
- [ ] Docker layer cache shared across untrusted builds
- [ ] Cache write from PR branches polluting main branch

## Detailed Checks

### Cache Key Design
<!-- activation: keywords=["key:", "hashFiles", "cache-key", "restore-keys", "prefix", "checksum", "lock"] -->

- [ ] **Key too broad (missing lockfile hash)**: flag cache keys that use only the branch name, OS, or a static string without incorporating the lockfile hash (e.g., `hashFiles('**/package-lock.json')`) -- a broad key serves stale dependencies when the lockfile changes, causing build failures or dependency drift between cached and fresh builds
- [ ] **Missing lockfile in hash**: flag cache keys that hash the manifest (package.json, Cargo.toml) instead of the lockfile (package-lock.json, Cargo.lock) -- manifest changes do not capture transitive dependency resolution. Always hash the lockfile for deterministic invalidation
- [ ] **Missing OS/architecture in key**: flag cache keys that omit `runner.os` or architecture when the pipeline runs on multiple platforms -- cached binaries from Linux are incompatible with macOS or ARM. Include the platform: `${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}`
- [ ] **No fallback restore-keys**: flag `actions/cache` or equivalent without `restore-keys` -- without fallback keys, a cache miss on the exact key means a full dependency download. Provide progressively broader restore-keys: `restore-keys: |` with `${{ runner.os }}-node-` as fallback

### Cache Poisoning and Security
<!-- activation: keywords=["pull_request", "PR", "fork", "trust", "poison", "artifact", "build", "shared", "branch"] -->

- [ ] **PR cache poisoning main branch**: flag caching configurations where PR builds write cache entries that main branch builds can read -- a malicious PR can add poisoned dependencies or build artifacts to the cache, which are then used by the next main branch build. In GitHub Actions, caches are scoped to the branch but PRs can read from the base branch cache. Ensure build artifacts are not cached across trust boundaries
- [ ] **Build output cached across PRs**: flag configurations that cache compiled artifacts (build/, dist/, .next/) and share them across PRs -- a malicious PR could cache a trojaned build artifact that is restored by a subsequent PR or main branch build. Cache only dependency downloads, not build outputs, across trust boundaries
- [ ] **Docker layer cache shared across untrusted builds**: flag Docker layer caching (BuildKit cache, `docker/build-push-action` with `cache-from`) that shares layers between PR and main-branch builds -- a malicious Dockerfile change can poison cached layers
- [ ] **Secrets in cached paths**: flag cache paths that may include credential files (.env, .npmrc with auth tokens, pip.conf with index credentials) -- cached credentials are accessible to all builds that restore the cache, including builds triggered by contributors without secret access

### Cache Invalidation and Freshness
<!-- activation: keywords=["invalidat", "stale", "lockfile", "lock", "hash", "change", "update", "dependab"] -->

- [ ] **Cache not invalidated on lockfile change**: flag cache configurations where the cache key does not change when the lockfile changes -- stale caches serve old dependency versions even after the lockfile is updated, causing "works in CI but not locally" or vice versa
- [ ] **Caching node_modules instead of .npm**: flag `actions/cache` or equivalent caching `node_modules/` directly instead of the npm cache directory (`~/.npm`) or yarn cache (`~/.yarn/cache`) -- caching node_modules bypasses `npm ci` integrity checking and may serve modules that do not match the lockfile. Cache the package manager's download cache and let `npm ci` or `yarn install --frozen-lockfile` populate node_modules from the lockfile
- [ ] **Vendor directory cached without lockfile hash**: flag caching of `vendor/` (Go, PHP Composer, Ruby Bundler) without the corresponding lockfile in the cache key -- vendored dependencies must exactly match the lockfile
- [ ] **No cache TTL or size limit**: flag caching configurations with no eviction policy -- unbounded caches grow indefinitely and serve increasingly stale entries. Most CI platforms auto-evict, but verify cache retention settings

### Cache Efficiency
<!-- activation: keywords=["compress", "size", "split", "partial", "warm", "cold", "hit", "miss"] -->

- [ ] **Large cache without compression**: flag caching of large directories (node_modules, .gradle, .m2) without compression -- compressed caches reduce upload/download time significantly. Most CI cache actions compress by default, but verify for custom cache implementations
- [ ] **Redundant cache entries**: flag workflows that cache the same dependencies in multiple jobs when a single shared cache step could serve all -- duplicate cache writes waste storage and upload time. Use a dedicated cache-warming job or workflow-level cache
- [ ] **Cache key collision between jobs**: flag different jobs using identical cache keys for different content -- the second write overwrites the first, and restore produces incorrect content. Include the job name or purpose in the cache key

## Common False Positives

- **Platform-managed cache scoping**: GitHub Actions automatically scopes caches by branch (PRs can read base branch but not write to it). The platform-level isolation may be sufficient without additional manual scoping.
- **Monorepo with shared lockfile**: monorepos with a root-level lockfile legitimately use a single cache key for all jobs. The broad key is correct if all jobs share the same dependency tree.
- **Build cache for trusted builds**: caching build outputs on the main branch for deployment (not shared with PRs) is a valid performance optimization.
- **Pre-built dependency caches**: some teams maintain pre-built dependency caches as explicit artifacts. This is intentional and not a finding if the cache is verified.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secrets or credentials in cached path | Critical |
| PR cache poisoning main branch build artifacts | Important |
| Docker layer cache shared across trust boundaries | Important |
| Build output cached and shared across untrusted PRs | Important |
| node_modules cached instead of package manager cache (bypasses integrity) | Important |
| Cache key missing lockfile hash (stale dependencies) | Minor |
| Cache key missing OS/architecture qualifier | Minor |
| No fallback restore-keys (cold cache on every lockfile change) | Minor |
| No cache TTL or eviction policy | Minor |
| Redundant cache entries across jobs | Minor |

## See Also

- `cicd-github-actions` -- GitHub Actions cache scoping and security model
- `cicd-gitlab-ci` -- GitLab CI cache key design and scope
- `cicd-circleci` -- CircleCI save_cache/restore_cache patterns
- `cicd-pipeline-secrets-discipline` -- secrets in CI caches as a leakage vector
- `sec-supply-chain-sbom-slsa-sigstore` -- dependency integrity and lockfile verification

## Authoritative References

- [GitHub Actions Caching Documentation](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows)
- [GitLab CI Caching](https://docs.gitlab.com/ee/ci/caching/)
- [CircleCI Caching Best Practices](https://circleci.com/docs/caching/)
- [Cache Poisoning in CI/CD (Legit Security)](https://www.legitsecurity.com/blog/cache-poisoning-in-github-actions)
- [CWE-345: Insufficient Verification of Data Authenticity](https://cwe.mitre.org/data/definitions/345.html)
