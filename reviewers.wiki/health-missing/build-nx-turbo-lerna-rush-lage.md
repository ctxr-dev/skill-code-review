---
id: build-nx-turbo-lerna-rush-lage
type: primary
depth_role: leaf
focus: Detect monorepo orchestration misconfigurations including cache invalidation errors, task graph cycles, missing affected calculation, overly broad inputs, and workspace protocol misuse
parents:
  - index.md
covers:
  - Cache misconfiguration causing stale or incorrect outputs
  - Task graph cycles causing deadlocks or infinite loops
  - Missing affected calculation running all tasks on every change
  - Overly broad inputs invalidating cache on unrelated changes
  - "Workspace protocol (workspace:*) leaking into published packages"
  - Missing task dependencies causing incorrect execution order
  - Remote cache without authentication
  - Missing outputs declaration causing incomplete caching
  - Inconsistent dependency versions across workspace packages
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
activation:
  file_globs:
    - nx.json
    - turbo.json
    - lerna.json
    - rush.json
    - lage.config.js
    - workspace.json
    - project.json
    - pnpm-workspace.yaml
  keyword_matches:
    - pipeline
    - dependsOn
    - outputs
    - cache
    - affected
    - workspace
    - turbo
    - nx
    - rush
    - lerna
  structural_signals:
    - monorepo_config_change
    - task_pipeline_change
    - workspace_config_change
source:
  origin: file
  path: build-nx-turbo-lerna-rush-lage.md
  hash: "sha256:31ecfc714cec5f4452d663fdf711fdd05422a23c5faf8232e3dbfc63e4022ec1"
---
# Monorepo Orchestrators (Nx / Turborepo / Lerna / Rush / Lage)

## When This Activates

Activates when diffs touch monorepo configuration files (nx.json, turbo.json, lerna.json, rush.json, lage.config.js), workspace configuration (pnpm-workspace.yaml, workspace.json), or project-level configuration (project.json). This reviewer detects orchestration misconfigurations that cause incorrect builds: task caches returning stale outputs due to missing inputs/outputs declarations, task graph cycles causing hangs, missing affected calculation running the entire monorepo on every commit, and workspace protocol versions leaking into published packages.

## Audit Surface

- [ ] Task pipeline missing outputs declaration for cached tasks
- [ ] Task pipeline missing dependsOn for cross-project dependency
- [ ] Cache inputs including generated files or node_modules
- [ ] Circular task dependency in pipeline configuration
- [ ] No affected/changed filter in CI pipeline
- [ ] Remote cache (Nx Cloud, Turborepo Remote Cache) without access token
- [ ] workspace:* version in package published to registry
- [ ] Missing implicitDependencies or project references
- [ ] Duplicate dependency versions across workspace packages
- [ ] Rush pnpm-lock.yaml or shrinkwrap not committed
- [ ] Lerna useWorkspaces: false with npm workspaces available
- [ ] Missing nx:affected or turbo --filter in CI
- [ ] Task with both cache: true and side effects (deploy, publish)
- [ ] Missing namedInputs or globalDependencies configuration

## Detailed Checks

### Cache Configuration
<!-- activation: file_globs=["nx.json", "turbo.json", "project.json"], keywords=["cache", "outputs", "inputs", "namedInputs", "globalDependencies", "hash"] -->

- [ ] **Missing outputs declaration**: flag cached tasks without explicit `outputs` -- without outputs, the cache cannot restore build artifacts, causing cache hits that produce empty results
- [ ] **Overly broad inputs**: flag task inputs that include `node_modules/**`, `dist/**`, or other generated directories -- these change frequently and invalidate the cache on unrelated modifications
- [ ] **Missing globalDependencies**: flag nx.json or turbo.json without global dependency declarations for root config files (.eslintrc, tsconfig.base.json) -- changes to shared config should invalidate all affected caches
- [ ] **Caching side-effectful tasks**: flag tasks like `deploy`, `publish`, or `migrate` with `cache: true` -- side-effectful tasks must not be cached because replaying them from cache skips the side effect
- [ ] **Missing namedInputs**: flag monorepos without `namedInputs` (Nx) or `globalDependencies` (Turbo) -- without named input sets, cache keys include unnecessary files, reducing hit rates

### Task Graph and Dependencies
<!-- activation: keywords=["dependsOn", "pipeline", "topological", "^build", "^test", "task", "order"] -->

- [ ] **Missing dependsOn for cross-project dep**: flag tasks that consume outputs from another project's build without declaring `dependsOn: ["^build"]` -- the task may execute before its dependency is built, consuming stale or missing artifacts
- [ ] **Circular task dependency**: flag pipeline configurations where task A depends on task B which depends on task A (directly or transitively) -- cycles cause the orchestrator to deadlock or error
- [ ] **Missing topological prefix**: flag `dependsOn: ["build"]` when the intent is to depend on upstream project builds -- use `"^build"` (Nx/Turbo) for topological (upstream) dependencies vs `"build"` for same-project dependencies
- [ ] **Missing implicit dependency**: flag projects that import from a workspace sibling without declaring it as a dependency in project.json or package.json -- the affected calculation will miss this project when the sibling changes

### Affected Calculation and CI
<!-- activation: keywords=["affected", "filter", "since", "changed", "CI", "pipeline", "github", "base", "head"] -->

- [ ] **Missing affected filter in CI**: flag CI pipelines running `nx run-many --all` or `turbo run build` without `--affected`, `--filter`, or `--since` -- without affected filtering, every CI run builds and tests the entire monorepo regardless of what changed
- [ ] **Incorrect affected base**: flag `--base` pointing to an incorrect branch or missing `NX_BASE` / `TURBO_REMOTE_ONLY` configuration -- incorrect base causes the affected calculation to include too many or too few projects
- [ ] **Remote cache without auth**: flag Nx Cloud or Turborepo remote cache configuration without an access token or read/write token -- unauthenticated caches can be poisoned or read by unauthorized users
- [ ] **Missing CI cache configuration**: flag CI workflows that do not configure remote caching or local cache restoration -- without caching, the monorepo pays full build cost on every CI run

### Workspace Protocol and Package Publishing
<!-- activation: keywords=["workspace:", "publish", "version", "release", "lerna publish", "nx release", "changeset"] -->

- [ ] **workspace:* in published package**: flag `"dependency": "workspace:*"` or `"workspace:^"` in package.json of packages intended for npm publish -- the workspace protocol is resolved by the monorepo tool at publish time but breaks if the publish step does not substitute versions
- [ ] **Inconsistent versions across packages**: flag the same dependency at different versions across workspace packages -- inconsistent versions cause duplicate modules in node_modules and potential runtime conflicts
- [ ] **Rush lockfile not committed**: flag Rush repositories without committed pnpm-lock.yaml or shrinkwrap file -- monorepo lockfiles must be committed for deterministic installs

### Configuration Consistency
<!-- activation: keywords=["lerna", "useWorkspaces", "npmClient", "rush", "pnpmfile", "lage", "config"] -->

- [ ] **Lerna without useWorkspaces**: flag `"useWorkspaces": false` in lerna.json when the project uses npm/yarn/pnpm workspaces -- Lerna should delegate to the workspace manager for hoisting and linking
- [ ] **Mixed orchestrators**: flag projects with both nx.json and turbo.json active -- using multiple orchestrators causes confusion about which tool controls task execution and caching
- [ ] **Missing project references**: flag TypeScript monorepos without `references` in tsconfig.json aligning with the monorepo dependency graph -- missing references cause incorrect incremental compilation

## Common False Positives

- **Cached tasks with idempotent side effects**: some tasks like `lint` produce side effects (console output) but are safe to cache because replaying the cache correctly signals success/failure.
- **Run-many --all in release pipelines**: release pipelines intentionally build all packages regardless of changes. Flag only in PR/commit CI pipelines.
- **workspace:* in non-published internal packages**: internal packages never published to a registry can safely use the workspace protocol.
- **Multiple orchestrator configs during migration**: projects migrating from Lerna to Nx may temporarily have both configurations. Flag only when migration has stalled.

## Severity Guidance

| Finding | Severity |
|---|---|
| Remote cache without authentication | Critical |
| Missing outputs declaration causing empty cache restores | Critical |
| Circular task dependency in pipeline | Important |
| Missing dependsOn for cross-project dependency | Important |
| Missing affected filter in CI (builds everything on every commit) | Important |
| workspace:* in package published to npm | Important |
| Caching side-effectful task (deploy, publish) | Important |
| Overly broad inputs reducing cache hit rate | Minor |
| Missing namedInputs or globalDependencies | Minor |
| Inconsistent dependency versions across packages | Minor |

## See Also

- `build-npm-yarn-pnpm-bun` -- underlying package manager configuration for Node.js monorepos
- `build-lockfile-hygiene` -- lockfile-specific checks applicable to monorepo lockfiles
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance for published workspace packages

## Authoritative References

- [Nx Documentation: Mental Model](https://nx.dev/concepts/mental-model)
- [Nx Documentation: Cache Task Results](https://nx.dev/features/cache-task-results)
- [Turborepo Documentation: Caching](https://turbo.build/repo/docs/crafting-your-repository/caching)
- [Rush Documentation: Lockfile Explorer](https://rushjs.io/pages/commands/rush_install/)
- [Lerna Documentation: Workspaces](https://lerna.js.org/docs/features/workspaces)
