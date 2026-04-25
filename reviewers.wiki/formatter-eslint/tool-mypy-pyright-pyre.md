---
id: tool-mypy-pyright-pyre
type: primary
depth_role: leaf
focus: "Detect misconfigured or under-utilized Python type checkers -- type:ignore without error codes, missing strict mode, Any leaking into public APIs, missing py.typed markers, and outdated stubs"
parents:
  - index.md
covers:
  - "type: ignore without a specific error code"
  - "type: ignore with an error code but no justification comment"
  - Missing strict mode when the project has significant type coverage
  - Any type leaking into public API signatures
  - Missing py.typed marker for typed packages
  - "Stub files (.pyi) outdated or missing for internal modules"
  - Incremental mode masking errors that full analysis would catch
  - Conflicting mypy and pyright configurations
  - Missing type annotations on public functions and methods
  - "Cast() used without justification (potential type lie)"
  - "Mypy plugins not configured for frameworks (Django, SQLAlchemy, Pydantic)"
tags:
  - mypy
  - pyright
  - pyre
  - python
  - type-checking
  - typing
  - strict-mode
  - stubs
  - any-type
activation:
  file_globs:
    - "**/mypy.ini"
    - "**/.mypy.ini"
    - "**/pyproject.toml"
    - "**/setup.cfg"
    - "**/pyrightconfig.json"
    - "**/.pyre_configuration"
    - "**/*.pyi"
  keyword_matches:
    - "type: ignore"
    - "type:ignore"
    - "pyright:"
    - pyre-fixme
    - pyre-ignore
    - reveal_type
    - "cast("
    - Any
    - py.typed
  structural_signals:
    - mypy or pyright config file present
    - inline type ignore annotation
    - stub files present
source:
  origin: file
  path: tool-mypy-pyright-pyre.md
  hash: "sha256:71b2b4de04f7e60f54815e0a8185ba72f906d17cc0c72dc34ff81a5d4a9665e5"
---
# Mypy / Pyright / Pyre Configuration and Suppression Hygiene

## When This Activates

Activates when the repository contains Python type checker configuration (mypy.ini, pyproject.toml with [tool.mypy], pyrightconfig.json, .pyre_configuration), when type: ignore annotations appear in the diff, or when .pyi stub files are present. Focuses on whether the type checker is configured at an appropriate strictness level and whether suppressions are justified.

## Audit Surface

- [ ] type: ignore without a specific error code
- [ ] type: ignore with error code but no justification comment
- [ ] Mypy strict mode not enabled when project has high type coverage
- [ ] Public function or method parameter typed as Any
- [ ] Public function or method return type is Any or missing
- [ ] py.typed marker missing for a package meant to be consumed as typed
- [ ] Stub file (.pyi) exists but is outdated relative to the source (.py)
- [ ] Incremental mode with no periodic full check
- [ ] Both mypy and pyright configured with different strictness levels
- [ ] typing.cast() used without justification
- [ ] Per-module overrides disable strict checks for production modules
- [ ] Framework plugin missing (django-stubs, sqlalchemy-stubs, pydantic plugin)
- [ ] reveal_type() or assert_type() left in production code
- [ ] New type: ignore annotations added in this PR exceed 3

## Detailed Checks

### Type Ignore Discipline
<!-- activation: keywords=["type: ignore", "type:ignore", "pyre-fixme", "pyre-ignore", "pyright:"] -->

- [ ] Flag `# type: ignore` without a bracketed error code -- blanket ignores suppress all type errors on the line and mask real issues
- [ ] Flag `# type: ignore[error-code]` without a justification comment -- the error code alone does not explain why the suppression is safe
- [ ] Flag `# pyre-fixme` or `# pyre-ignore` without a task number or explanation -- Pyre's convention expects `# pyre-fixme[code]: reason`
- [ ] Flag `# pyright: ignore[rule]` without justification
- [ ] Count new type: ignore annotations in the PR -- more than 3 suggests a systemic type issue that should be resolved rather than suppressed
- [ ] Flag type: ignore on lines involving security-sensitive operations (authentication, authorization, crypto) -- type correctness matters most where safety matters most

### Strict Mode and Coverage Progression
<!-- activation: file_globs=["**/mypy.ini", "**/.mypy.ini", "**/pyproject.toml", "**/pyrightconfig.json"] -->

- [ ] Check mypy configuration for strict mode flags: disallow_untyped_defs, disallow_any_generics, warn_return_any, no_implicit_optional -- if the project has significant type coverage, strict should be enabled
- [ ] Check Pyright's typeCheckingMode -- "basic" misses many issues; "strict" or at least "standard" is appropriate for typed projects
- [ ] If per-module overrides in mypy config set `disallow_untyped_defs = false` or `ignore_errors = true` for production modules, flag the relaxation
- [ ] Verify that new modules added to the project are not exempted from type checking via per-module ignore_errors
- [ ] Check that incremental mode (mypy's default) is supplemented by periodic full checks in CI -- incremental mode can miss cross-module errors after refactoring

### Any Type Leakage
<!-- activation: keywords=["Any", "cast(", "object"] -->

- [ ] Flag public function or method parameters typed as `Any` -- callers lose all type safety at the boundary
- [ ] Flag public function return types of `Any` or missing return type annotations -- Any propagates through every consumer
- [ ] Flag `typing.cast()` without a comment explaining why the cast is safe -- cast is a type-level assertion with no runtime check and can introduce type lies
- [ ] Flag `# type: ignore` used to silence errors caused by Any propagation -- the fix is to add proper types, not to suppress the error
- [ ] Flag `reveal_type()` or `typing.assert_type()` left in production code -- these are debugging aids

### Stubs and Framework Integration
<!-- activation: file_globs=["**/*.pyi", "**/py.typed"], keywords=["django-stubs", "sqlalchemy-stubs", "pydantic"] -->

- [ ] If the package is distributed for consumption (check setup.py/pyproject.toml for package config), verify py.typed marker exists -- without it, consumers' type checkers ignore the package's type annotations
- [ ] If .pyi stub files exist for internal modules, verify they are in sync with the corresponding .py files -- stale stubs are worse than no stubs
- [ ] If the project uses Django, verify django-stubs and the mypy plugin are configured
- [ ] If the project uses SQLAlchemy, verify sqlalchemy-stubs or the SQLAlchemy 2.0+ native types are used
- [ ] If the project uses Pydantic, verify the Pydantic mypy plugin is enabled for model type support
- [ ] If both mypy and pyright are configured, verify their strictness levels are consistent -- different configurations lead to conflicting feedback

## Common False Positives

- **Dynamic framework code**: Django models, SQLAlchemy mapped classes, and Pydantic models use metaclasses that confuse type checkers without plugins. Extension absence is the issue.
- **Protocol classes and ABCs**: Abstract methods and Protocol definitions may appear to have missing return types when the type is intentionally left to implementors.
- **Overloaded functions**: Complex overloads may require type: ignore on certain branches. Verify the overload signatures are correct before flagging.
- **Third-party library without stubs**: Some libraries lack type stubs. `type: ignore[import-untyped]` is acceptable when no stubs exist and the library maintainer has not added py.typed.
- **Test mocks and patches**: unittest.mock.patch and MagicMock produce Any types by nature. Type ignores in test code are more acceptable than in production.

## Severity Guidance

| Finding | Severity |
|---|---|
| type: ignore without error code (blanket suppression) | Important |
| Any type in public API signature with no justification | Important |
| Mypy/Pyright not running in CI | Important |
| reveal_type() left in production code | Important |
| type: ignore with error code but no justification | Minor |
| py.typed marker missing for distributed package | Minor |
| Strict mode not enabled for well-typed project | Minor |
| Framework plugin missing | Minor |
| Stale stub file | Minor |

## See Also

- `tool-ruff-pylint` -- Ruff handles linting; mypy/pyright handle type checking. noqa and type: ignore are distinct suppression mechanisms
- `author-self-review-hygiene` -- bare type: ignore without justification is a hygiene issue
- `principle-fail-fast` -- suppressing type errors defers failure detection; strict mode enforces fail-fast at the type level
- `principle-naming-and-intent` -- type annotations are a form of intent documentation; Any erases that intent
- `tool-sonarqube-semgrep-codeql` -- SAST tools complement type checkers for security analysis

## Authoritative References

- [mypy: Configuration](https://mypy.readthedocs.io/en/stable/config_file.html)
- [mypy: Common Issues](https://mypy.readthedocs.io/en/stable/common_issues.html)
- [Pyright: Configuration](https://microsoft.github.io/pyright/#/configuration)
- [PEP 561: Distributing and Packaging Type Information](https://peps.python.org/pep-0561/)
