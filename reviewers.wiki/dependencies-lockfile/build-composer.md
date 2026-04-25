---
id: build-composer
type: primary
depth_role: leaf
focus: Detect Composer misconfigurations including missing composer.lock, wildcard versions, scripts with shell commands, missing platform config, and dev dependencies in production autoload
parents:
  - index.md
covers:
  - Missing composer.lock in application repositories
  - Wildcard or overly permissive version constraints
  - Scripts section executing shell commands directly
  - Missing platform config for PHP version enforcement
  - Dev dependencies loaded via production autoload
  - Insecure Packagist mirror or custom repository
  - Abandoned packages still in dependencies
  - Missing autoload configuration causing class loading failures
  - Root-only dependencies not marked as such
tags:
  - composer
  - php
  - packagist
  - lockfile
  - autoload
  - platform
  - dependencies
  - scripts
activation:
  file_globs:
    - composer.json
    - composer.lock
    - auth.json
  keyword_matches:
    - require
    - require-dev
    - autoload
    - scripts
    - repositories
    - platform
    - minimum-stability
    - packagist
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - php_packaging_change
source:
  origin: file
  path: build-composer.md
  hash: "sha256:6a2dd285180aed67bf0b44c6c252f131f2b20bbd43449499d8d7d4f4220e74ef"
---
# Composer (PHP Package Manager)

## When This Activates

Activates when diffs touch composer.json, composer.lock, or auth.json. This reviewer detects PHP Composer misconfigurations: missing composer.lock allowing non-deterministic installs, wildcard versions accepting arbitrary upgrades, scripts executing shell commands with elevated risk, missing platform configuration allowing PHP version mismatches, and dev dependencies leaking into production autoload paths.

## Audit Surface

- [ ] composer.lock missing from application repository
- [ ] composer.json dependency using * or >= without upper bound
- [ ] Scripts section containing shell commands (exec, system, passthru)
- [ ] Missing config.platform.php in composer.json
- [ ] require-dev package used in production autoload-dev path that is loaded in production
- [ ] Repository URL using http:// instead of https://
- [ ] Package marked as abandoned in Packagist still listed as dependency
- [ ] composer install without --no-dev in production Dockerfile
- [ ] Missing autoload section in composer.json
- [ ] composer.lock out of sync with composer.json
- [ ] Minimum-stability set to dev or alpha in production
- [ ] Custom Packagist repository without disable-tls protection
- [ ] prefer-dist not used in CI (slower source downloads)

## Detailed Checks

### Lockfile and Pinning
<!-- activation: file_globs=["composer.json", "composer.lock", ".gitignore"], keywords=["require", "version", "*", ">=", "lock", "install"] -->

- [ ] **Missing composer.lock**: flag application repositories with composer.json but no composer.lock -- `composer install` resolves the latest matching versions without a lockfile, producing different results across environments
- [ ] **Lockfile in .gitignore**: flag .gitignore excluding composer.lock -- application lockfiles must be committed for deterministic builds
- [ ] **Wildcard version**: flag `"*"` as version constraint in require section -- accepts any version including those with known CVEs
- [ ] **Open-ended lower bound**: flag `">=1.0"` without upper bound in production dependencies -- allows major version jumps with breaking changes
- [ ] **Lockfile out of sync**: flag diffs where composer.json changes but composer.lock is not updated -- run `composer update` after modifying constraints
- [ ] **Minimum-stability too loose**: flag `"minimum-stability": "dev"` or `"alpha"` without `"prefer-stable": true` in production applications -- allows installation of unstable, untested releases

### Scripts and Security
<!-- activation: keywords=["scripts", "post-install-cmd", "post-update-cmd", "exec", "system", "passthru", "shell_exec", "auth.json"] -->

- [ ] **Shell commands in scripts**: flag scripts section entries using `exec`, `system`, `passthru`, or direct shell commands -- scripts execute with the PHP process's privileges and can run arbitrary code
- [ ] **auth.json committed**: flag auth.json containing tokens or credentials committed to the repository -- use environment variables via `COMPOSER_AUTH` or `composer config --auth` locally
- [ ] **Insecure repository URL**: flag repository URLs using `http://` -- package downloads over plaintext are subject to MITM attacks
- [ ] **disable-tls in config**: flag `"disable-tls": true` in composer.json config -- disables certificate verification for all HTTPS connections

### Production Hygiene
<!-- activation: keywords=["require-dev", "autoload-dev", "no-dev", "production", "deploy", "Dockerfile", "optimize-autoloader"] -->

- [ ] **Missing --no-dev in production**: flag Dockerfile or production deploy scripts running `composer install` without `--no-dev` -- installs dev dependencies (test frameworks, debug tools) in production
- [ ] **Dev dependency in production path**: flag packages in `require-dev` whose classes are imported in production source files -- these packages are not installed with `--no-dev` and will cause autoload failures
- [ ] **Missing --optimize-autoloader**: flag production installs without `--optimize-autoloader` or `--classmap-authoritative` -- optimized autoloading improves performance by generating a classmap
- [ ] **Abandoned package**: flag dependencies whose Packagist page shows an "abandoned" notice -- migrate to the suggested replacement

### Platform Configuration
<!-- activation: keywords=["platform", "php", "ext-", "config", "require"] -->

- [ ] **Missing platform.php config**: flag composer.json without `config.platform.php` for applications deployed to specific PHP versions -- without it, Composer resolves packages based on the developer's local PHP version, which may differ from production
- [ ] **Missing ext- requirements**: flag applications that use PHP extensions without declaring them in the `require` section (e.g., `ext-json`, `ext-mbstring`) -- missing extension declarations cause runtime errors
- [ ] **PHP version constraint too loose**: flag `"php": ">=7.4"` allowing resolution against PHP versions the application has not been tested on -- constrain to tested versions

## Common False Positives

- **Library packages omitting composer.lock**: PHP libraries conventionally do not commit composer.lock so consumers test against compatible versions. Flag only for applications and services.
- **Dev scripts using shell commands**: composer scripts for development tasks (code generation, database migration) commonly use shell commands. Flag only when the script runs in production or CI builds.
- **Open-ended constraints on stable packages**: `^1.0` is the Composer default and is generally safe for semver-compliant packages. Flag `>=` without bound, not `^` on stable packages.

## Severity Guidance

| Finding | Severity |
|---|---|
| auth.json with credentials committed to repository | Critical |
| disable-tls in composer configuration | Critical |
| composer.lock missing from application repository | Critical |
| Wildcard (*) version in production dependency | Important |
| Missing --no-dev in production install | Important |
| HTTP repository URL | Important |
| Dev dependency imported in production source code | Important |
| Minimum-stability set to dev without prefer-stable | Important |
| Missing platform.php config | Minor |
| Abandoned package without suggested replacement | Minor |
| Missing ext- requirements in composer.json | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in PHP dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for published PHP packages

## Authoritative References

- [Composer Documentation: Lock File](https://getcomposer.org/doc/01-basic-usage.md#commit-your-composer-lock-file-to-version-control)
- [Composer Documentation: Scripts](https://getcomposer.org/doc/articles/scripts.md)
- [Composer Documentation: Config Platform](https://getcomposer.org/doc/06-config.md#platform)
- [Packagist Security Advisories](https://packagist.org/advisories)
- [PHP Security Advisories Database](https://github.com/FriendsOfPHP/security-advisories)
