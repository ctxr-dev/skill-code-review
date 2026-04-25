---
id: build-bundler
type: primary
depth_role: leaf
focus: Detect Bundler misconfigurations including missing Gemfile.lock, unpinned gem versions, git source gems without ref pinning, platform-specific gem omissions, and missing Ruby version requirements
parents:
  - index.md
covers:
  - Missing Gemfile.lock in application repositories
  - Gem versions unpinned or using overly permissive ranges
  - Git source gems without ref or tag pinning
  - Platform-specific gems missing from lockfile
  - Missing required_ruby_version in gemspec
  - Gems sourced from non-default or HTTP registries
  - Development gems leaking into production group
  - Gemfile.lock not updated after Gemfile changes
  - "Insecure gem sources (http:// instead of https://)"
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
activation:
  file_globs:
    - Gemfile
    - Gemfile.lock
    - "*.gemspec"
    - .ruby-version
    - ".bundle/config"
  keyword_matches:
    - "gem "
    - source
    - group
    - bundler
    - bundle
    - rubygems
    - required_ruby_version
    - platform
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - ruby_version_change
source:
  origin: file
  path: build-bundler.md
  hash: "sha256:39f3a15dbd3377134e3c13a8cc9cb69adb7b0193fad20dfcea415886df75d2cb"
---
# Bundler (Ruby Package Manager)

## When This Activates

Activates when diffs touch Gemfile, Gemfile.lock, .gemspec files, .ruby-version, or .bundle/config. This reviewer detects Ruby Bundler misconfigurations: missing Gemfile.lock allowing non-deterministic gem resolution, unpinned versions that accept breaking changes, git source gems without commit pinning, missing platform declarations causing deployment failures, and absent Ruby version requirements in published gemspecs.

## Audit Surface

- [ ] Gemfile.lock missing from application repository
- [ ] Gemfile dependency without version constraint
- [ ] Gemfile dependency using >= without upper bound
- [ ] Git source gem without ref, tag, or branch pin
- [ ] Missing PLATFORMS section in Gemfile.lock for deployment targets
- [ ] Missing required_ruby_version in .gemspec for published gems
- [ ] Gemfile source using http:// instead of https://
- [ ] Gem in default group that belongs in :development or :test
- [ ] Gemfile.lock changed without corresponding Gemfile change
- [ ] Gemfile changed without Gemfile.lock regeneration
- [ ] bundle install used instead of bundle install --frozen in CI
- [ ] Missing .ruby-version or .tool-versions file
- [ ] Vendored gems (vendor/bundle) committed without update tracking

## Detailed Checks

### Lockfile Integrity
<!-- activation: file_globs=["Gemfile", "Gemfile.lock", ".gitignore"], keywords=["lock", "frozen", "deployment", "install", "bundle"] -->

- [ ] **Missing Gemfile.lock**: flag application repositories with Gemfile but no Gemfile.lock -- without a lockfile, `bundle install` resolves the latest matching versions, which may differ across environments
- [ ] **Lockfile in .gitignore**: flag .gitignore excluding Gemfile.lock -- application lockfiles must be committed for deterministic builds
- [ ] **Gemfile changed without lock update**: flag diffs where Gemfile adds or modifies gems but Gemfile.lock is not updated -- the lockfile no longer reflects the Gemfile
- [ ] **CI not using frozen install**: flag CI scripts using `bundle install` without `--frozen` or `--deployment` flag -- unfrozen installs can modify the lockfile during CI
- [ ] **Missing platform in lockfile**: flag Gemfile.lock missing platform entries for deployment targets (e.g., `x86_64-linux` for containers, `ruby` for MRI) -- gems with native extensions will fail to install on unlisted platforms

### Version Pinning
<!-- activation: keywords=["gem ", "version", ">=", "~>", "*", "pessimistic"] -->

- [ ] **Unpinned gem**: flag `gem 'rails'` without any version constraint -- accepts any version including major upgrades with breaking changes
- [ ] **Open-ended lower bound**: flag `gem 'rails', '>= 5.0'` without upper bound -- allows arbitrary major version upgrades
- [ ] **Missing pessimistic constraint**: flag production gems using `>=` instead of `~>` (pessimistic operator) -- `~> 2.5` allows 2.x but not 3.0, providing reasonable flexibility with safety
- [ ] **Exact pin preventing patches**: flag overly strict `gem 'rails', '= 7.0.1'` that prevents security patch updates -- prefer `~> 7.0.1` to allow patch-level updates

### Git Sources and Registry Safety
<!-- activation: keywords=["git", "github", "source", "http://", "https://", "ref:", "tag:", "branch:", "rubygems"] -->

- [ ] **Git gem without ref pin**: flag `gem 'foo', git: 'https://...'` without `ref:`, `tag:`, or `branch:` -- defaults to the default branch HEAD, which changes between installs
- [ ] **Git gem with branch pin only**: flag `gem 'foo', git: '...', branch: 'main'` -- branches are mutable; prefer `ref:` with a full commit SHA for reproducibility
- [ ] **HTTP gem source**: flag `source 'http://rubygems.org'` -- gem downloads over plaintext are subject to MITM; use `https://rubygems.org`
- [ ] **Multiple gem sources without scoping**: flag multiple `source` blocks without using `source` blocks scoped to specific gems -- Bundler may resolve gems from unexpected sources

### Production Group Hygiene
<!-- activation: keywords=["group", ":development", ":test", ":production", "require", "without"] -->

- [ ] **Dev gem in default group**: flag gems that belong in `:development` or `:test` group placed in the default (production) group -- increases production bundle size and attack surface
- [ ] **Missing --without in production**: flag production Dockerfile or deploy scripts running `bundle install` without `--without development test` -- installs unnecessary gems in production
- [ ] **Test framework in production**: flag test gems (rspec, minitest, capybara, factory_bot) outside a `:test` group -- test frameworks should never be available in production

### Ruby Version and Gemspec Metadata
<!-- activation: file_globs=["*.gemspec", ".ruby-version", ".tool-versions"], keywords=["required_ruby_version", "ruby", "engine"] -->

- [ ] **Missing required_ruby_version**: flag published gemspecs without `required_ruby_version` -- consumers cannot detect Ruby version incompatibility until runtime
- [ ] **Missing .ruby-version**: flag application repositories without `.ruby-version` or `.tool-versions` -- developers may use incompatible Ruby versions
- [ ] **Gemspec without license**: flag gemspecs missing the `license` or `licenses` field -- license metadata is required for compliance auditing

## Common False Positives

- **Gems omitting lockfiles as libraries**: Ruby gem libraries conventionally do not commit Gemfile.lock so consumers test against compatible versions. Flag only for applications and services.
- **Branch-pinned git gems during development**: during active development of a companion gem, branch pins are common. Flag only on main/release branches.
- **Pessimistic constraint on stable gems**: `~> 2.5` is the standard Ruby convention and is generally safe. Flag only when a gem has a history of non-semver releases.
- **Multiple sources for private gem servers**: organizations commonly use a private gem server alongside rubygems.org. Flag only when sources are not scoped to specific gems.

## Severity Guidance

| Finding | Severity |
|---|---|
| HTTP gem source (http://rubygems.org) | Critical |
| Gemfile.lock missing from application repository | Critical |
| Unpinned gem accepting any version in production | Important |
| Git gem without ref pin on main branch | Important |
| Dev/test gems in production group | Important |
| CI using unfrozen bundle install | Important |
| Missing platform entries in Gemfile.lock for deploy targets | Minor |
| Missing required_ruby_version in gemspec | Minor |
| Missing .ruby-version file | Minor |
| Exact version pin preventing patch updates | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in Ruby gem dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for published gems

## Authoritative References

- [Bundler Documentation: Gemfile.lock](https://bundler.io/guides/rationale.html)
- [Bundler Documentation: Deploying](https://bundler.io/guides/deploying.html)
- [RubyGems Guides: Security](https://guides.rubygems.org/security/)
- [bundler-audit Documentation](https://github.com/rubysec/bundler-audit)
- [Ruby Advisory Database](https://github.com/rubysec/ruby-advisory-db)
