---
id: build-pip-poetry-uv-pdm-rye
type: primary
depth_role: leaf
focus: Detect misconfigurations in Python package managers including unpinned dependencies, missing hash verification, editable installs in production, and build isolation issues
parents:
  - index.md
covers:
  - Missing lockfile or requirements.txt without hashes
  - Unpinned dependencies allowing arbitrary version resolution
  - pip install without --require-hashes in production
  - Missing python_requires metadata in published packages
  - Build isolation disabled allowing host contamination
  - "Editable installs (pip install -e) in production deployments"
  - "Mixed dependency sources (--extra-index-url) enabling confusion attacks"
  - Missing constraints file for transitive dependency control
  - setup.py with arbitrary code execution during install
  - Virtual environment not isolated from system Python
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
activation:
  file_globs:
    - "requirements*.txt"
    - pyproject.toml
    - setup.py
    - setup.cfg
    - Pipfile
    - Pipfile.lock
    - poetry.lock
    - pdm.lock
    - uv.lock
    - pip.conf
    - .python-version
    - constraints.txt
  keyword_matches:
    - pip install
    - poetry
    - pdm
    - uv pip
    - rye
    - require-hashes
    - extra-index-url
    - index-url
    - virtualenv
    - python_requires
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - python_packaging_change
source:
  origin: file
  path: build-pip-poetry-uv-pdm-rye.md
  hash: "sha256:043022024a74131e1682a0c6fe157a1c07c20ed154ce57cc49bc52edd805420b"
---
# Python Package Managers (pip / Poetry / uv / PDM / Rye)

## When This Activates

Activates when diffs touch Python packaging files (requirements.txt, pyproject.toml, setup.py, setup.cfg, Pipfile), lockfiles (poetry.lock, pdm.lock, uv.lock, Pipfile.lock), or pip configuration (pip.conf, .python-version). This reviewer detects Python-specific supply-chain risks: unpinned dependencies that resolve differently across environments, missing hash verification that allows package substitution, editable installs that bypass normal installation paths, dependency confusion from mixed index URLs, and build isolation issues that leak host system state into package builds.

## Audit Surface

- [ ] requirements.txt without == pinning or --hash verification
- [ ] pyproject.toml dependencies using >= without upper bound
- [ ] Pipfile or pyproject.toml with * as version specifier
- [ ] pip install command without --require-hashes flag in CI or Dockerfile
- [ ] Missing poetry.lock, pdm.lock, uv.lock, or requirements.txt lockfile
- [ ] --extra-index-url used without explicit package scoping
- [ ] pip install -e in Dockerfile or production deployment script
- [ ] --no-build-isolation flag used in production install
- [ ] setup.py executing network calls or arbitrary commands at install time
- [ ] Missing python_requires in setup.cfg or pyproject.toml for published package
- [ ] pip install from git URL without pinned commit hash
- [ ] requirements.txt generated without --generate-hashes
- [ ] Virtual environment path included in committed files
- [ ] sys.path manipulation in production code
- [ ] Missing __init__.py causing implicit namespace package confusion

## Detailed Checks

### Lockfile and Pinning
<!-- activation: file_globs=["requirements*.txt", "pyproject.toml", "Pipfile", "poetry.lock", "pdm.lock", "uv.lock", "Pipfile.lock"], keywords=["==", ">=", "~=", "*", "pin", "lock", "freeze"] -->

- [ ] __Missing lockfile__: flag projects with pyproject.toml or Pipfile but no corresponding lockfile (poetry.lock, pdm.lock, uv.lock, Pipfile.lock) -- builds resolve differently across environments without a lockfile
- [ ] __Unpinned requirements.txt__: flag requirements.txt entries using `>=`, `~=`, or bare package names without `==` pinning -- `requests>=2.0` can resolve to any future version
- [ ] __Wildcard versions__: flag `*` as a version specifier in Pipfile or pyproject.toml dependencies -- accepts any version including those with known CVEs
- [ ] __Missing upper bound on production deps__: flag pyproject.toml `[project.dependencies]` using `>=` without an upper bound -- allows major version jumps in production
- [ ] __Lockfile out of sync__: flag diffs where pyproject.toml dependencies change but the lockfile is not regenerated -- the lockfile no longer reflects the declared constraints

### Hash Verification and Integrity
<!-- activation: keywords=["require-hashes", "hash", "sha256", "integrity", "pip install", "pip-compile", "--generate-hashes"] -->

- [ ] __Missing --require-hashes__: flag `pip install -r requirements.txt` in Dockerfile or CI without `--require-hashes` -- without hash checking, a compromised PyPI mirror can substitute packages
- [ ] __requirements.txt without hashes__: flag requirements.txt files that lack `--hash=sha256:...` entries -- use `pip-compile --generate-hashes` to produce hash-verified requirements
- [ ] __Mixed hashed and unhashed entries__: flag requirements.txt where some entries have hashes and others do not -- pip requires all-or-nothing hash checking; partial hashing is rejected
- [ ] __Hash algorithm downgrade__: flag hash entries using sha1 or md5 instead of sha256 -- weaker algorithms are vulnerable to collision attacks

### Dependency Confusion and Index Configuration
<!-- activation: keywords=["extra-index-url", "index-url", "registry", "pypi", "pip.conf", "source", "repository", "trusted-host"] -->

- [ ] __--extra-index-url without scoping__: flag pip install commands or pip.conf using `--extra-index-url` -- pip checks all indexes and installs the highest version from any source, enabling dependency confusion
- [ ] __--trusted-host bypassing TLS__: flag `--trusted-host` in pip commands or configuration -- disables certificate verification, enabling MITM attacks
- [ ] __Git dependency without commit pin__: flag `pip install git+https://...@main` or `git+https://...` without a commit SHA -- the resolved code changes between installs
- [ ] __HTTP index URL__: flag index-url or extra-index-url using `http://` -- package downloads over plaintext are subject to interception

### Production Deployment Hygiene
<!-- activation: keywords=["pip install -e", "editable", "develop", "setup.py", "build-isolation", "Dockerfile", "production", "deploy"] -->

- [ ] __Editable install in production__: flag `pip install -e .` or `pip install --editable` in Dockerfile or production deployment scripts -- editable installs link to source directories, are fragile, and bypass normal packaging
- [ ] __Disabled build isolation__: flag `--no-build-isolation` in production installs -- allows the host environment to leak into the build, causing non-reproducible packages
- [ ] __setup.py with arbitrary code__: flag setup.py files that import modules beyond setuptools/distutils or make network calls -- setup.py executes during install and can run arbitrary code
- [ ] __sys.path manipulation__: flag production code that modifies `sys.path` to locate packages -- indicates broken packaging; fix the install instead

### Package Metadata and Python Version
<!-- activation: keywords=["python_requires", "requires-python", "classifiers", "python_version", ".python-version", "pyenv"] -->

- [ ] __Missing python_requires__: flag published packages (those with `[project]` or `[tool.poetry]` name/version) without `requires-python` or `python_requires` -- consumers cannot detect Python version incompatibility
- [ ] __Missing .python-version__: flag application repositories without `.python-version` or equivalent (pyproject.toml `[tool.poetry.dependencies] python`) -- developers may use incompatible Python versions
- [ ] __Virtual environment committed__: flag `.venv/`, `venv/`, or `env/` directories appearing in the repository -- virtual environments are machine-specific and must not be committed

## Common False Positives

- __Library pyproject.toml with loose bounds__: published libraries intentionally use `>=` with loose upper bounds to avoid unnecessary version conflicts for consumers. Flag only for applications and services.
- __Editable installs in development scripts__: `pip install -e .` in Makefile targets intended for local development is standard practice. Flag only in Dockerfiles and production deployment contexts.
- __--no-build-isolation for C extensions__: some C extension packages require `--no-build-isolation` to access system libraries. Verify the package genuinely needs it before flagging.
- __Bare requirements.txt in tutorials/examples__: example code and tutorials may use unpinned requirements for simplicity. Flag only in production-facing code.

## Severity Guidance

| Finding | Severity |
|---|---|
| --extra-index-url without scoping (dependency confusion vector) | Critical |
| pip install in production without --require-hashes | Critical |
| Editable install in Dockerfile or production deployment | Critical |
| Missing lockfile for production application | Important |
| Unpinned dependencies in requirements.txt (no == pins) | Important |
| --trusted-host bypassing TLS verification | Important |
| setup.py executing network calls or importing non-standard modules | Important |
| Git dependency without commit SHA pin | Important |
| Missing python_requires in published package | Minor |
| Missing .python-version file | Minor |
| Virtual environment directory committed | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in Python dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for published Python packages
- `build-reproducibility-slsa-sigstore` -- reproducible build requirements for Python packages

## Authoritative References

- [pip Documentation: Secure installs with --require-hashes](https://pip.pypa.io/en/stable/topics/secure-installs/)
- [pip Documentation: --extra-index-url behavior](https://pip.pypa.io/en/stable/cli/pip_install/#cmdoption-extra-index-url)
- [Poetry Documentation: poetry.lock](https://python-poetry.org/docs/basic-usage/#installing-with-poetrylock)
- [uv Documentation: Lockfile](https://docs.astral.sh/uv/concepts/projects/#lockfile)
- [PDM Documentation: Lock file](https://pdm-project.org/latest/usage/dependency/)
- [PyPA: Dependency Specification](https://packaging.python.org/en/latest/specifications/dependency-specifiers/)
- [Alex Birsan: Dependency Confusion](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
