---
id: tool-ruff-pylint
type: primary
depth_role: leaf
focus: Detect misconfigured or under-utilized Ruff and Pylint setups -- overly broad per-file-ignores, unjustified noqa annotations, conflicting formatter configs, and missing rule categories
parents:
  - index.md
covers:
  - noqa comments without a specific rule code
  - noqa with a rule code but no justification comment
  - "per-file-ignores patterns that are too broad (disabling rules for entire directories)"
  - "Conflicting ruff/black/isort configurations"
  - Missing ruff format integration when ruff is used for linting
  - Pylint disable comments without a symbolic name or justification
  - "Ruff rule categories not enabled that the project should use (e.g., UP for pyupgrade)"
  - Custom Pylint plugins without tests
  - pyproject.toml and ruff.toml both present with conflicting settings
  - "Select list too narrow -- missing security (S), bugbear (B), or import (I) rules"
tags:
  - ruff
  - pylint
  - python
  - linter
  - noqa
  - formatting
  - isort
  - black
  - code-quality
activation:
  file_globs:
    - "**/ruff.toml"
    - "**/.ruff.toml"
    - "**/pyproject.toml"
    - "**/.pylintrc"
    - "**/pylintrc"
    - "**/setup.cfg"
  keyword_matches:
    - noqa
    - "pylint: disable"
    - "pylint: enable"
    - "type: ignore"
    - ruff
    - select =
    - per-file-ignores
  structural_signals:
    - ruff or pylint config file present
    - inline noqa annotation
    - pylint suppression comment
source:
  origin: file
  path: tool-ruff-pylint.md
  hash: "sha256:868f2d5b5afe5ed6530f3c4b9c80bf332aaa09a70df270aee241c71b0d6059a7"
---
# Ruff and Pylint Configuration and Suppression Hygiene

## When This Activates

Activates when the repository contains Ruff or Pylint configuration (ruff.toml, pyproject.toml with [tool.ruff] or [tool.pylint], .pylintrc), when noqa or pylint:disable annotations appear in the diff, or when ruff/pylint packages are in requirements. Focuses on whether the linting setup is effective and whether suppressions are justified.

## Audit Surface

- [ ] noqa without a specific rule code -- blanket suppression hides multiple issues
- [ ] noqa with rule code but no adjacent comment explaining the exception
- [ ] per-file-ignores entry covers an entire directory with a broad rule set
- [ ] Both ruff.toml and pyproject.toml [tool.ruff] exist with different settings
- [ ] Black and ruff format both configured -- only one formatter should own Python formatting
- [ ] isort and ruff's I rules both configured -- only one should sort imports
- [ ] Ruff select list omits commonly expected categories (UP, B, S, I, N)
- [ ] Pylint disable comment uses a numeric code instead of a symbolic name
- [ ] Pylint disable comment lacks an adjacent justification
- [ ] Custom Pylint checker plugin has no corresponding test file
- [ ] Ruff target-version does not match the project's minimum Python version
- [ ] Ruff per-file-ignores disables security rules (S) in non-test code
- [ ] Ruff ignore list at project level disables rules that should be per-file exceptions
- [ ] Missing py.typed marker when ruff type-checking rules are enabled

## Detailed Checks

### Blanket and Unjustified Suppressions
<!-- activation: keywords=["noqa", "pylint: disable", "pylint: enable"] -->

- [ ] Flag `# noqa` without a rule code -- this suppresses all Ruff/Flake8 rules on the line and masks real issues
- [ ] Flag `# noqa: <code>` without an adjacent comment explaining why the rule does not apply
- [ ] Flag `# pylint: disable=<rule>` without a justification -- especially when using numeric codes (C0114) instead of symbolic names (missing-module-docstring)
- [ ] Flag `# pylint: disable` blocks that span more than 10 lines -- long disable blocks suggest the code needs restructuring
- [ ] Count new noqa/pylint:disable annotations in the PR -- more than 3 new suppressions warrant discussion
- [ ] Flag noqa annotations on lines where the suppressed rule is auto-fixable -- the fix should be applied instead of suppressed

### Configuration Conflicts and Gaps
<!-- activation: file_globs=["**/ruff.toml", "**/.ruff.toml", "**/pyproject.toml"] -->

- [ ] If both ruff.toml and pyproject.toml contain [tool.ruff], flag the duplication -- ruff.toml takes precedence and pyproject.toml settings are silently ignored
- [ ] If both black and ruff format are configured (e.g., black in pre-commit and ruff format in CI), flag the conflict -- they may produce different output
- [ ] If both isort and ruff's I (isort) rules are enabled, flag the redundancy -- isort configuration (known_first_party, sections) may not match ruff's isort settings
- [ ] Verify ruff target-version matches the minimum Python version in pyproject.toml or setup.cfg -- a mismatch means pyupgrade rules target the wrong version
- [ ] Check that ruff's line-length matches any co-existing formatter's line length setting

### Per-File-Ignores and Global Ignore Scope
<!-- activation: keywords=["per-file-ignores", "ignore =", "select ="] -->

- [ ] Flag per-file-ignores entries that target entire directories with broad patterns (e.g., `tests/*` ignoring S101 is fine, but `src/*` ignoring E501 is too broad)
- [ ] Flag per-file-ignores that disable security rules (S category) outside of test directories
- [ ] Flag global ignore entries that should be per-file exceptions -- disabling a rule project-wide when only 2-3 files need the exception is too permissive
- [ ] Verify the select list includes commonly expected categories: E/W (pycodestyle), F (pyflakes), UP (pyupgrade), B (flake8-bugbear), I (isort), S (bandit/security) -- missing categories leave gaps
- [ ] Flag select = ["ALL"] without a substantial ignore list -- selecting all rules without curation produces noise

### Custom Plugins and Rule Extensions
<!-- activation: keywords=["pylint", "plugin", "checker", "extend-select"] -->

- [ ] If the project defines custom Pylint checker plugins, verify each has a corresponding test file
- [ ] If extend-select adds rules from third-party ruff plugins, verify those plugins are compatible with the current ruff version
- [ ] If Pylint loads custom plugins via load-plugins in the config, verify the plugin module is importable from the project's environment
- [ ] Check that generated-members in Pylint config is not overly broad -- suppressing attribute checks for entire modules masks real errors

## Common False Positives

- **Test files with intentional assertions**: `# noqa: S101` (use of assert) in test files is standard practice -- Ruff's per-file-ignores should handle this at config level, but inline is acceptable.
- **Django/ORM dynamic attributes**: Pylint false positives on Django model fields and queryset methods are well-known. `generated-members` or `pylint: disable=no-member` with a Django comment is justified.
- **Type stubs and protocol classes**: Files defining type stubs or Protocol classes may trigger unused-argument or abstract-method rules that do not apply.
- **Migration files**: Auto-generated migration files (Django, Alembic) should be in per-file-ignores, not individually annotated.
- **Notebook-converted scripts**: Python files converted from Jupyter notebooks may have formatting that ruff format would alter but that the notebook tooling expects.

## Severity Guidance

| Finding | Severity |
|---|---|
| Blanket noqa without rule code | Important |
| Security rules (S) disabled in per-file-ignores for non-test code | Important |
| Conflicting ruff.toml and pyproject.toml [tool.ruff] settings | Important |
| Black and ruff format both active with different configs | Important |
| noqa with rule code but no justification | Minor |
| Pylint disable using numeric code instead of symbolic name | Minor |
| Ruff select list missing commonly expected categories | Minor |
| target-version mismatch with project's minimum Python | Minor |
| isort and ruff I rules both configured | Minor |

## See Also

- `style-guide-supremacy` -- Ruff is a style authority; this reviewer checks its configuration while style-guide-supremacy enforces its output
- `author-self-review-hygiene` -- bare noqa without justification is a hygiene issue caught by both reviewers
- `tool-mypy-pyright-pyre` -- type checking complements Ruff's linting; type: ignore and noqa are different suppression mechanisms
- `principle-fail-fast` -- disabling lint rules defers error detection
- `tool-prettier-black-gofmt-rustfmt` -- formatter conflict detection for Black vs ruff format

## Authoritative References

- [Ruff: Configuring Ruff](https://docs.astral.sh/ruff/configuration/)
- [Ruff: Rule Selection](https://docs.astral.sh/ruff/settings/#select)
- [Pylint: User Guide](https://pylint.readthedocs.io/en/stable/)
- [Ruff: Formatter](https://docs.astral.sh/ruff/formatter/)
