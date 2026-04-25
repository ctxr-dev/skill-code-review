---
id: iac-chef-puppet-salt
type: primary
depth_role: leaf
focus: Detect Chef, Puppet, and Salt misconfigurations including hardcoded credentials in recipes and manifests, missing test coverage, non-idempotent resources, incomplete metadata, and state ordering issues
parents:
  - index.md
covers:
  - Hardcoded credentials in Chef recipes, Puppet manifests, or Salt states
  - Missing Test Kitchen, ChefSpec, rspec-puppet, or Salt testinfra tests
  - "Non-idempotent resources (execute without guard, exec without unless/onlyif)"
  - Puppet module without metadata.json
  - "Salt state ordering issues (missing require/watch/listen)"
  - Chef cookbook without Berksfile version constraints
  - Puppet manifest without resource ordering
  - Salt pillar with plaintext secrets
  - "Missing Foodcritic/Cookstyle linting in CI"
  - Deprecated resource syntax or DSL usage
tags:
  - chef
  - puppet
  - salt
  - iac
  - configuration-management
  - idempotency
  - testing
  - secrets
  - recipes
  - manifests
activation:
  file_globs:
    - "**/recipes/**"
    - "**/cookbooks/**"
    - "**/manifests/**"
    - "**/modules/**"
    - "**/salt/**"
    - "**/pillar/**"
    - "**/Berksfile"
    - "**/metadata.rb"
    - "**/metadata.json"
    - "**/*.pp"
    - "**/*.sls"
  keyword_matches:
    - recipe
    - cookbook
    - node
    - resource
    - include_recipe
    - class
    - define
    - puppet
    - salt
    - pillar
    - grains
    - state.apply
    - Test Kitchen
    - ChefSpec
    - rspec-puppet
  structural_signals:
    - chef_recipe_structure
    - puppet_manifest_structure
    - salt_state_structure
    - execute_without_guard
source:
  origin: file
  path: iac-chef-puppet-salt.md
  hash: "sha256:4a740b452fbbca738a6b9fe90e13d4e0dfab2d96be394988a3cf85c4793eddd6"
---
# Chef, Puppet, and Salt

## When This Activates

Activates when diffs touch Chef recipes or cookbooks, Puppet manifests or modules, or Salt states, pillars, or formulas. These configuration management tools enforce desired state on infrastructure -- a hardcoded credential in a recipe is committed to version control and deployed to every node, a non-idempotent resource causes destructive side effects on every convergence, and missing state ordering in Salt causes race conditions where a service starts before its configuration is written. This reviewer catches configuration management pitfalls that cause secret exposure, non-idempotent infrastructure, and convergence failures.

## Audit Surface

- [ ] Recipe, manifest, or state with plaintext credential
- [ ] Chef cookbook without Test Kitchen or ChefSpec
- [ ] Puppet module without rspec-puppet or Rakefile
- [ ] Salt formula without tests/ directory
- [ ] Chef execute/bash without not_if/only_if guard
- [ ] Puppet exec without unless/onlyif/creates
- [ ] Salt cmd.run without creates/unless/onlyif
- [ ] Puppet module missing metadata.json
- [ ] Salt state without require/watch ordering
- [ ] Berksfile without version constraints
- [ ] Deprecated resource syntax
- [ ] Salt pillar with plaintext credentials
- [ ] Missing linter in CI pipeline

## Detailed Checks

### Secrets in Configuration Code
<!-- activation: keywords=["password", "secret", "api_key", "token", "credential", "encrypted_data_bag", "vault", "pillar", "eyaml", "hiera"] -->

- [ ] **Hardcoded credentials in Chef**: flag recipes or attributes with literal passwords, API keys, or tokens -- use encrypted data bags, Chef Vault, or external secrets management (HashiCorp Vault, AWS Secrets Manager)
- [ ] **Plaintext in Puppet manifests**: flag Puppet manifests with literal passwords or keys in resource parameters -- use hiera-eyaml for encrypted Hiera data or external lookup functions
- [ ] **Plaintext secrets in Salt pillars**: flag pillar files containing unencrypted passwords, keys, or tokens -- use Salt's GPG renderer, sdb interface, or external Vault integration to encrypt pillar data
- [ ] **Credentials in version control**: flag data_bags/, pillar/, or hiera/ directories containing unencrypted secret files committed to git -- encrypt before committing or use external secret stores

### Idempotency
<!-- activation: keywords=["execute", "bash", "script", "exec", "cmd.run", "cmd.script", "not_if", "only_if", "unless", "onlyif", "creates", "guard"] -->

- [ ] **Chef execute without guard**: flag `execute`, `bash`, `ruby_block`, or `script` resources without `not_if`, `only_if`, or `creates` guards -- ungaurded exec resources run on every convergence, potentially causing destructive side effects (restarting services, overwriting files, modifying databases)
- [ ] **Puppet exec without condition**: flag `exec` resources without `unless`, `onlyif`, `creates`, or `refreshonly` -- an exec without conditions runs every Puppet agent cycle (default 30 minutes), creating drift and load
- [ ] **Salt cmd.run without idempotency**: flag `cmd.run` and `cmd.script` states without `creates`, `unless`, or `onlyif` -- Salt states should be idempotent; raw command execution breaks this contract
- [ ] **Shell command replacing idempotent resource**: flag shell/exec usage for operations that have dedicated resources (e.g., `execute 'apt-get install nginx'` instead of `package 'nginx'`) -- built-in resources handle idempotency, platform abstraction, and reporting correctly

### Testing
<!-- activation: keywords=["kitchen", "ChefSpec", "InSpec", "rspec-puppet", "serverspec", "testinfra", "molecule", "Rakefile", "spec_helper", "test"] -->

- [ ] **Chef cookbook without tests**: flag cookbooks missing `.kitchen.yml` (integration tests) and `spec/` directory (ChefSpec unit tests) -- untested cookbooks are validated only on production nodes
- [ ] **Puppet module without tests**: flag modules missing `spec/` directory, `Rakefile`, or `.fixtures.yml` for rspec-puppet -- untested manifests break on the first agent run in production
- [ ] **Salt formula without tests**: flag formulas without a `tests/` directory or testinfra/pytest configuration -- Salt states are complex YAML+Jinja transformations that need verification beyond syntax checking
- [ ] **Missing linter in CI**: flag CI pipelines without Cookstyle (Chef), puppet-lint (Puppet), or salt-lint (Salt) -- linters catch deprecated syntax, style violations, and common errors before convergence

### Metadata and Dependencies
<!-- activation: keywords=["metadata", "Berksfile", "Puppetfile", "requirements", "depends", "version", "metadata.json", "metadata.rb"] -->

- [ ] **Puppet module without metadata.json**: flag Puppet modules missing `metadata.json` -- metadata defines module name, version, dependencies, and supported platforms; without it, the Puppet Forge, r10k, and dependency resolution cannot process the module
- [ ] **Berksfile without version constraints**: flag Chef Berksfile entries without version constraints (`cookbook 'nginx'` instead of `cookbook 'nginx', '~> 12.0'`) -- unconstrained dependencies pull the latest version, breaking reproducible converge
- [ ] **Salt formula without version pinning**: flag Salt formulas depending on external formulas via gitfs without branch/tag pinning -- unpinned git sources pull latest, breaking formulas on upstream changes

### State Ordering (Salt-specific)
<!-- activation: keywords=["require", "watch", "listen", "order", "requisite", "require_in", "watch_in", "listen_in", "onfail"] -->

- [ ] **Missing require/watch requisites**: flag Salt states where a service state does not `watch` or `require` its configuration file state -- without requisites, Salt may apply states in arbitrary order, starting a service before its config is deployed
- [ ] **Circular requisites**: flag Salt states with circular `require` chains -- circular dependencies cause Salt to skip all states in the cycle with an error
- [ ] **Missing listen/watch for service restart**: flag configuration file changes that should trigger a service restart but have no `watch`/`listen` relationship -- the service continues running with stale configuration until manually restarted

## Common False Positives

- **Execute for one-off provisioning**: `execute` resources with `creates` guards that run only once during initial provisioning are acceptable.
- **Test Kitchen not needed for library cookbooks**: cookbooks that only define LWRPs or libraries may use ChefSpec alone without full integration testing.
- **Puppet exec with refreshonly**: `exec` with `refreshonly => true` only runs when notified, which is idempotent by design.
- **Salt ordering via state auto-ordering**: Salt's `order` option or file-level ordering may substitute for explicit requisites in simple formulas.

## Severity Guidance

| Finding | Severity |
|---|---|
| Plaintext credential in recipe, manifest, pillar, or data bag | Critical |
| Unencrypted secret file committed to version control | Critical |
| Non-idempotent exec running on every convergence | Important |
| Missing test coverage for production role/cookbook/formula | Important |
| Shell command replacing idempotent resource | Important |
| Missing state ordering causing race condition | Important |
| Puppet module without metadata.json | Minor |
| Berksfile without version constraints | Minor |
| Missing linter in CI | Minor |
| Deprecated resource syntax | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- secrets must not appear in configuration management code
- `sec-owasp-a05-misconfiguration` -- configuration management misconfigurations propagate to all managed nodes
- `iac-ansible` -- alternative configuration management tool with analogous idempotency and testing concerns
- `iac-secrets-sops-sealed-secrets-vault` -- secret management integration for configuration management tools
- `iac-drift-detection` -- configuration management convergence is a form of drift remediation

## Authoritative References

- [Chef Infra Documentation](https://docs.chef.io/chef_overview/)
- [Puppet Documentation: Best Practices](https://www.puppet.com/docs/puppet/latest/style_guide.html)
- [Salt Best Practices](https://docs.saltproject.io/en/latest/topics/best_practices.html)
- [Test Kitchen Documentation](https://kitchen.ci/)
- [rspec-puppet Documentation](https://rspec-puppet.com/)
