---
id: build-npm-yarn-pnpm-bun
type: primary
depth_role: leaf
focus: Detect misconfigurations in Node.js package managers including missing lockfiles, wildcard versions, unreviewed lifecycle scripts, registry misconfigurations, and production bundle bloat
parents:
  - index.md
covers:
  - Missing lockfile in application repositories
  - Wildcard or overly permissive version ranges in package.json
  - Unreviewed postinstall or lifecycle scripts in dependencies
  - Missing .npmrc for private registry or scope configuration
  - devDependencies leaking into production bundles
  - Peer dependency conflicts left unresolved
  - Missing engines field allowing incompatible Node.js versions
  - "Inconsistent package manager usage across team (npm vs yarn vs pnpm)"
  - Workspace protocol misuse in publishable packages
  - Overrides or resolutions bypassing security patches
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
activation:
  file_globs:
    - package.json
    - package-lock.json
    - yarn.lock
    - pnpm-lock.yaml
    - bun.lockb
    - .npmrc
    - .yarnrc.yml
    - .pnpmfile.cjs
    - bunfig.toml
    - .nvmrc
    - .node-version
  keyword_matches:
    - dependencies
    - devDependencies
    - peerDependencies
    - scripts
    - postinstall
    - engines
    - packageManager
    - workspaces
    - overrides
    - resolutions
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - new_dependency_added
source:
  origin: file
  path: build-npm-yarn-pnpm-bun.md
  hash: "sha256:3a2c3f8ddbe5caec558693add6102fe7e6457a8fac4452091d4f6f6a4e2fd011"
---
# Node.js Package Managers (npm / Yarn / pnpm / Bun)

## When This Activates

Activates when diffs touch package.json, lockfiles (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb), or package manager configuration files (.npmrc, .yarnrc.yml, .pnpmfile.cjs, bunfig.toml). This reviewer detects supply-chain risks specific to the Node.js ecosystem: missing lockfiles that create non-deterministic builds, wildcard versions that accept arbitrary upgrades, lifecycle scripts that execute arbitrary code during install, registry misconfigurations that enable dependency confusion, and production bundles bloated with development-only packages.

## Audit Surface

- [ ] Lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb) missing from repository
- [ ] package.json uses * or x as version specifier
- [ ] package.json uses >= without upper bound on production dependency
- [ ] Dependency declares postinstall, preinstall, or install lifecycle script
- [ ] No .npmrc file when project uses private registry or scoped packages
- [ ] .npmrc contains auth token or credential inline
- [ ] devDependency imported in production source file
- [ ] Peer dependency conflict reported by package manager but unresolved
- [ ] Missing engines field in package.json for application (not library)
- [ ] Multiple lockfile types present in same repository
- [ ] Overrides or resolutions pin a dependency to an older version
- [ ] packageManager field in package.json missing when using Corepack
- [ ] Workspace protocol (workspace:*) used in a package published to registry
- [ ] bundledDependencies includes packages with known vulnerabilities
- [ ] npm publish without --provenance flag in CI

## Detailed Checks

### Lockfile Presence and Consistency
<!-- activation: file_globs=["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", ".gitignore"], keywords=["lock", "frozen", "ci", "install"] -->

- [ ] **Missing lockfile**: flag application repositories with package.json but no lockfile -- without a lockfile, `npm install` resolves the latest matching version, which may differ across environments
- [ ] **Lockfile in .gitignore**: flag .gitignore entries excluding lockfiles -- lockfiles must be committed for deterministic builds
- [ ] **Multiple lockfiles**: flag repositories containing more than one lockfile type (e.g., both package-lock.json and yarn.lock) -- teams must standardize on one package manager to avoid resolution conflicts
- [ ] **CI not using frozen install**: flag CI scripts using `npm install` instead of `npm ci`, `yarn install --frozen-lockfile`, or `pnpm install --frozen-lockfile` -- non-frozen installs can mutate the lockfile during CI
- [ ] **packageManager field missing**: flag projects using Corepack without a `packageManager` field in package.json -- without this field, contributors may use different package manager versions

### Version Pinning and Ranges
<!-- activation: keywords=["dependencies", "devDependencies", "version", "*", ">=", "latest", "^0.", "~0."] -->

- [ ] **Wildcard versions**: flag `*`, `x`, or empty version specifiers in dependencies or devDependencies -- these accept any version, defeating reproducibility and enabling supply-chain attacks
- [ ] **Open-ended lower bounds**: flag `>=1.0.0` without an upper bound in production dependencies -- allows major version jumps that may introduce breaking changes or vulnerabilities
- [ ] **Caret on 0.x semver**: flag `^0.x.y` in dependencies -- caret ranges on pre-1.0 packages permit breaking changes because `^0.2.0` matches `0.3.0`
- [ ] **`latest` tag as version**: flag `"latest"` as a version specifier -- non-deterministic and can silently pull compromised releases

### Lifecycle Scripts and Registry Safety
<!-- activation: keywords=["postinstall", "preinstall", "install", "prepare", "scripts", "registry", ".npmrc", "scope", "auth", "token"] -->

- [ ] **Unreviewed lifecycle scripts**: flag new dependencies that declare `postinstall`, `preinstall`, or `install` scripts -- these execute arbitrary code during `npm install` with the installing user's privileges
- [ ] **Missing .npmrc for scoped packages**: flag projects using `@scope/` packages from a private registry without an .npmrc (or .yarnrc.yml) configuring the scope -- missing configuration risks resolving private names from the public registry (dependency confusion)
- [ ] **Credentials in .npmrc**: flag .npmrc files containing `_authToken`, `_password`, or `//registry.../:_authToken` values inline -- tokens should come from environment variables (`${NPM_TOKEN}`)
- [ ] **HTTP registry URL**: flag registry URLs using `http://` instead of `https://` -- package downloads over plaintext are subject to MITM attacks

### Production Bundle Hygiene
<!-- activation: keywords=["devDependencies", "import", "require", "bundle", "webpack", "esbuild", "vite", "rollup", "build", "production", "omit"] -->

- [ ] **devDependency in production code**: flag import or require statements in production source files referencing packages listed only in devDependencies -- these packages may not be installed in production
- [ ] **Production install without --omit=dev**: flag Dockerfile or CI production build steps running `npm install` or `npm ci` without `--omit=dev` (or `--production`) -- installs unnecessary dev packages, increasing image size and attack surface
- [ ] **Missing sideEffects field**: flag published packages lacking a `sideEffects` field in package.json -- bundlers cannot tree-shake effectively without this declaration

### Peer Dependencies and Engines
<!-- activation: keywords=["peerDependencies", "peerDependenciesMeta", "engines", "node", "npm", "overrides", "resolutions"] -->

- [ ] **Unresolved peer dependency conflicts**: flag peer dependency warnings emitted by the package manager but not addressed -- conflicting peer deps can cause runtime errors from duplicate package instances
- [ ] **Missing engines field**: flag application (not library) package.json files without an `engines` field specifying the required Node.js version -- allows deployment on incompatible runtimes
- [ ] **Overrides forcing older version**: flag `overrides` (npm) or `resolutions` (yarn) that pin a transitive dependency below the version required by a direct dependency -- may suppress security patches
- [ ] **Workspace protocol in published package**: flag `workspace:*` or `workspace:^` version specifiers in packages intended for npm publish -- the workspace protocol is not resolved by the public registry

## Common False Positives

- **Libraries omitting lockfiles**: npm and Yarn documentation suggest libraries may omit lockfiles so consumers test against the latest compatible versions. Valid for published libraries; not valid for applications or services.
- **Monorepo root devDependencies**: monorepo root package.json commonly lists devDependencies (linters, test frameworks) that are not part of any published package's production bundle.
- **Caret ranges on stable packages**: `^1.2.3` is the npm default and is generally safe for semver-compliant libraries. Flag only on 0.x packages or libraries with a history of non-semver releases.
- **Lifecycle scripts in trusted first-party packages**: postinstall scripts in internal packages maintained by the same organization carry lower risk than those in third-party packages.
- **engines field on internal tooling**: ephemeral scripts or internal tools with no deployment pipeline may reasonably omit the engines field.

## Severity Guidance

| Finding | Severity |
|---|---|
| Lockfile missing from application repository | Critical |
| .npmrc contains inline auth token committed to repository | Critical |
| Wildcard (*) version specifier in production dependency | Critical |
| Missing .npmrc scope configuration exposing dependency confusion risk | Important |
| Unreviewed postinstall script in new third-party dependency | Important |
| devDependency imported in production source code | Important |
| CI using `npm install` instead of `npm ci` (unfrozen lockfile) | Important |
| Overrides or resolutions pinning dependency below latest patch | Important |
| Multiple lockfile types in same repository | Minor |
| Missing engines field in application package.json | Minor |
| Caret range on 0.x dependency | Minor |
| workspace:* in non-published internal package | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in npm dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for published npm packages
- `build-nx-turbo-lerna-rush-lage` -- monorepo tooling that wraps these package managers

## Authoritative References

- [npm Documentation: package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)
- [npm Documentation: scripts lifecycle](https://docs.npmjs.com/cli/v10/using-npm/scripts)
- [Yarn Documentation: Zero-Installs](https://yarnpkg.com/features/caching#zero-installs)
- [pnpm Documentation: .npmrc settings](https://pnpm.io/npmrc)
- [Bun Documentation: bun.lockb](https://bun.sh/docs/install/lockfile)
- [Node.js Corepack Documentation](https://nodejs.org/api/corepack.html)
- [npm provenance (RFC 0626)](https://github.com/npm/rfcs/blob/main/implemented/0626-npm-provenance.md)
