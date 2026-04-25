---
id: iac-ansible
type: primary
depth_role: leaf
focus: Detect Ansible misconfigurations including plaintext passwords in variables, missing privilege escalation controls, unnotified handlers, roles without tests, hardcoded hosts, missing vault encryption, and idempotency violations
parents:
  - index.md
covers:
  - Plaintext passwords or secrets in vars files, group_vars, or host_vars
  - "Missing become/privilege escalation control on tasks requiring root"
  - Handlers defined but never notified by tasks
  - Roles without Molecule or integration tests
  - Hardcoded IP addresses or hostnames in playbooks
  - Secrets not encrypted with ansible-vault
  - "Non-idempotent tasks (shell/command without creates/removes)"
  - Missing ansible-lint in CI pipeline
  - Deprecated modules or module syntax
  - "Missing error handling (block/rescue/always)"
tags:
  - ansible
  - iac
  - vault
  - secrets
  - idempotency
  - handlers
  - molecule
  - roles
  - privilege-escalation
activation:
  file_globs:
    - "**/playbooks/**"
    - "**/roles/**"
    - "**/inventory/**"
    - "**/group_vars/**"
    - "**/host_vars/**"
    - "**/ansible.cfg"
    - "**/*.yml"
    - "**/*.yaml"
  keyword_matches:
    - ansible
    - playbook
    - hosts
    - tasks
    - handlers
    - roles
    - become
    - vault
    - ansible-vault
    - molecule
    - gather_facts
    - notify
    - register
  structural_signals:
    - ansible_playbook_structure
    - role_directory_layout
    - vault_encrypted_file
    - handler_without_notify
source:
  origin: file
  path: iac-ansible.md
  hash: "sha256:ddfebdd9fa780de2820b860fc96564a6309cddbc75543e3f91e38bd2f7ec5b86"
---
# Ansible

## When This Activates

Activates when diffs touch Ansible playbooks, roles, inventory files, group_vars, host_vars, or ansible.cfg. Ansible executes tasks on remote hosts with SSH and escalated privileges -- a plaintext password in group_vars is committed to version control and readable by every engineer, a shell command without idempotency guard runs destructively on every playbook execution, and an unnotified handler means a service restart never happens after a configuration change. This reviewer catches Ansible-specific misconfigurations that cause secret exposure, non-idempotent infrastructure changes, and silent configuration drift.

## Audit Surface

- [ ] Variable file with plaintext password, key, or token
- [ ] Task with become: true without become_user specified
- [ ] Handler never notified by any task
- [ ] Role without molecule/ or tests/ directory
- [ ] Playbook with hardcoded IP in hosts field
- [ ] Secret not encrypted with ansible-vault
- [ ] shell/command task without changed_when or creates
- [ ] CI pipeline without ansible-lint step
- [ ] Deprecated module without FQCN
- [ ] Missing block/rescue for fallible tasks
- [ ] Role without meta/main.yml
- [ ] Inventory with plaintext SSH passwords
- [ ] Task without name field
- [ ] Missing --check mode support in CI

## Detailed Checks

### Secrets and Vault
<!-- activation: keywords=["vault", "ansible-vault", "password", "secret", "api_key", "token", "vault_password_file", "no_log", "ANSIBLE_VAULT"] -->

- [ ] **Plaintext secrets in vars**: flag variable files (group_vars, host_vars, defaults, vars) containing plaintext passwords, API keys, tokens, or private keys -- use `ansible-vault encrypt` to encrypt the file or individual values with `!vault` tag
- [ ] **Inventory with plaintext credentials**: flag inventory files containing `ansible_ssh_pass`, `ansible_become_pass`, or connection credentials in plaintext -- use vault-encrypted variables or SSH key authentication
- [ ] **Missing no_log on secret tasks**: flag tasks that use, print, or register secret values without `no_log: true` -- Ansible logs task output by default, exposing secrets in CI logs and callback output
- [ ] **Vault password committed**: flag `.vault_pass`, `vault_password_file`, or similar vault password files committed to version control -- the vault password unlocks all encrypted secrets; inject via environment variable or CI secret

### Idempotency
<!-- activation: keywords=["shell", "command", "raw", "script", "changed_when", "creates", "removes", "register", "stat"] -->

- [ ] **shell/command without idempotency guard**: flag `shell`, `command`, `raw`, or `script` tasks without `changed_when`, `creates`, or `removes` -- these tasks report "changed" on every run, making it impossible to detect actual infrastructure drift; use `changed_when: false` for read-only commands or `creates`/`removes` for file-producing operations
- [ ] **Idempotent module replaced with shell**: flag `shell` or `command` used for operations that have dedicated Ansible modules (e.g., `shell: apt-get install` instead of `ansible.builtin.apt`) -- dedicated modules handle idempotency, check mode, and diff mode correctly
- [ ] **Missing check mode support**: flag playbooks or roles that have never been validated with `--check` -- check mode validates idempotency without making changes; roles that break in check mode have idempotency bugs

### Handlers and Notifications
<!-- activation: keywords=["handlers", "notify", "handler", "listen", "flush_handlers", "meta"] -->

- [ ] **Handler never notified**: flag handler definitions in handlers/main.yml that are never referenced by a `notify` directive in any task -- orphaned handlers indicate dead code or a missing notification after a configuration file change
- [ ] **Notify without matching handler**: flag tasks with `notify: restart apache` where no handler named "restart apache" exists -- the playbook runs without error but the handler never fires, leaving the service running with stale configuration
- [ ] **Missing flush_handlers before dependent tasks**: flag sequences where a configuration change notifies a handler but a subsequent task depends on the restarted service -- handlers run at the end of the play by default; use `meta: flush_handlers` to force immediate execution

### Role Quality
<!-- activation: keywords=["role", "molecule", "meta/main.yml", "defaults", "tasks/main.yml", "requirements.yml", "galaxy"] -->

- [ ] **Role without tests**: flag roles without a `molecule/` or `tests/` directory -- untested roles are validated only in production; Molecule provides local testing with Docker, Vagrant, or delegated drivers
- [ ] **Role without meta/main.yml**: flag roles missing `meta/main.yml` -- metadata defines dependencies, supported platforms, and Galaxy metadata; missing metadata breaks `ansible-galaxy install` and dependency resolution
- [ ] **Hardcoded hosts in playbook**: flag `hosts:` fields with literal IP addresses or hostnames instead of inventory group names -- hardcoded hosts prevent playbook reuse across environments and make inventory management impossible
- [ ] **Missing FQCN**: flag modules referenced without fully qualified collection name (e.g., `apt` instead of `ansible.builtin.apt`) -- FQCN is required since Ansible 2.10 and prevents ambiguity when multiple collections provide modules with the same short name

### Privilege Escalation
<!-- activation: keywords=["become", "become_user", "become_method", "sudo", "su", "privilege", "escalation"] -->

- [ ] **become: true without become_user**: flag tasks with `become: true` but no `become_user` specified -- the default become_user is root, which should be explicit rather than implicit to signal intent
- [ ] **Global become without task-level override**: flag playbooks with `become: true` at the play level where individual tasks do not need root -- apply become at the task level to follow least-privilege and make auditing easier
- [ ] **Missing become_method**: flag become usage without `become_method` in environments using non-sudo escalation (doas, pfexec, su) -- the default is sudo, which may not be available on all target systems

## Common False Positives

- **shell for one-off scripts**: legitimate use of `shell` for complex one-liners without an equivalent module, provided `changed_when` is set appropriately.
- **Become: true at play level for system roles**: system administration roles (package installation, service management) legitimately need root for most tasks.
- **Handler in shared role**: handlers may be notified from other roles that include the shared role, making them appear orphaned within their own role.
- **Molecule not present for legacy roles**: older roles may use Vagrant or custom test scripts instead of Molecule.

## Severity Guidance

| Finding | Severity |
|---|---|
| Plaintext password in vars or inventory | Critical |
| Vault password file committed to version control | Critical |
| Missing no_log on task handling secrets | Important |
| shell/command without idempotency guard | Important |
| Handler never notified (missed service restart) | Important |
| Hardcoded hosts in production playbook | Important |
| Role without tests | Important |
| Missing FQCN for module references | Minor |
| become: true without explicit become_user | Minor |
| Task without name field | Minor |
| Role without meta/main.yml | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- secrets must not appear in Ansible vars or inventory
- `sec-owasp-a05-misconfiguration` -- Ansible misconfiguration leads to infrastructure misconfiguration
- `iac-chef-puppet-salt` -- alternative configuration management tools with analogous concerns
- `iac-secrets-sops-sealed-secrets-vault` -- vault and secret management patterns for IaC
- `iac-drift-detection` -- Ansible does not detect drift natively; idempotent runs approximate it

## Authoritative References

- [Ansible Best Practices](https://docs.ansible.com/ansible/latest/tips_tricks/ansible_tips_tricks.html)
- [Ansible Vault Documentation](https://docs.ansible.com/ansible/latest/vault_guide/index.html)
- [Molecule Documentation](https://ansible.readthedocs.io/projects/molecule/)
- [ansible-lint Rules](https://ansible.readthedocs.io/projects/lint/rules/)
- [Ansible Module Index](https://docs.ansible.com/ansible/latest/collections/index_module.html)
