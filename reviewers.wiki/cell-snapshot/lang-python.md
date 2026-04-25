---
id: lang-python
type: primary
depth_role: leaf
focus: Catch Python-specific bugs, anti-patterns, type errors, and security pitfalls in diffs
parents:
  - index.md
covers:
  - Mutable default arguments in function signatures
  - "Type annotation correctness (PEP 484/585/604/612/646/695)"
  - "Async/await discipline and event-loop blocking"
  - Exception handling specificity and bare except clauses
  - Resource management via context managers
  - "Security: pickle, yaml.load, eval, subprocess shell=True"
  - "GIL-aware concurrency choices (threading vs multiprocessing)"
  - Pathlib usage over os.path string manipulation
  - Generator and iterator protocol correctness
  - Dataclass and attrs field gotchas
  - Packaging metadata and dependency pinning
  - "f-string and string formatting security in SQL/HTML contexts"
tags:
  - python
  - typing
  - async
  - security
  - packaging
activation:
  file_globs:
    - "**/*.py"
    - "**/*.pyi"
    - "**/pyproject.toml"
    - "**/setup.cfg"
    - "**/Pipfile"
  structural_signals:
    - Python source files in diff
    - Type stub files present
    - Python packaging config changed
source:
  origin: file
  path: lang-python.md
  hash: "sha256:4974750bf0b3540126c8171462f386757a763da658fc68743ad5b2841d55ae1e"
---
# Python Quality Reviewer

## When This Activates

Activates when the diff contains `.py` or `.pyi` files, or when Python packaging files (`pyproject.toml`, `setup.cfg`, `Pipfile`) are modified. Also activates for Jupyter notebook exports that produce `.py` files.

## Audit Surface

- [ ] No mutable default arguments (`def f(x=[])` — use `None` + assignment in body)
- [ ] No bare `except:` or `except Exception:` that silently swallows errors
- [ ] No `pickle.load` / `yaml.load` on untrusted input without `SafeLoader`
- [ ] No `eval()` / `exec()` / `compile()` with user-controlled strings
- [ ] No `subprocess` with `shell=True` and interpolated commands
- [ ] All `open()` calls use context managers (`with` statement)
- [ ] `async def` functions never call blocking I/O directly (file, network, sleep)
- [ ] `# type: ignore` comments specify the error code (`# type: ignore[assignment]`)
- [ ] Public functions have return type annotations
- [ ] No `assert` statements used for input validation (removed under `-O`)
- [ ] No hardcoded secrets, tokens, or passwords in source
- [ ] Exception chains preserved (`raise X from Y` when wrapping)
- [ ] No circular imports introduced by new top-level imports
- [ ] `__all__` maintained in public `__init__.py` modules
- [ ] f-strings not used to build SQL queries or HTML output (injection risk)

## Detailed Checks

### Type System and Annotations
<!-- activation: keywords=["typing", "type", "Generic", "Protocol", "TypeVar", "overload"] -->

- [ ] Use PEP 585 built-in generics (`list[int]`) instead of `typing.List[int]` on Python 3.9+
- [ ] Use PEP 604 union syntax (`X | Y`) instead of `Union[X, Y]` on Python 3.10+
- [ ] Use PEP 612 `ParamSpec` for decorator return types that preserve signatures
- [ ] Use PEP 695 type parameter syntax (`def f[T](x: T)`) on Python 3.12+ where appropriate
- [ ] `TypeVar` bounds and constraints are correct — `bound=Base` vs `TypeVar("T", int, str)`
- [ ] `@overload` signatures cover all branches; implementation signature is not public
- [ ] `Protocol` classes use `runtime_checkable` only when `isinstance` checks are needed
- [ ] `TypedDict` uses `total=False` or `Required`/`NotRequired` correctly for optional keys
- [ ] `cast()` calls are justified with a comment explaining why the type system cannot infer
- [ ] No `Any` leaking into public API signatures without explicit justification
- [ ] `ClassVar` used for class-level attributes that should not appear in `__init__`
- [ ] `Final` used for constants that must not be reassigned

### Error Handling
<!-- activation: keywords=["except", "raise", "try", "error", "Exception"] -->

- [ ] Exceptions are specific — `except ValueError` not `except Exception`
- [ ] Exception chains use `raise ... from ...` to preserve traceback context
- [ ] `finally` blocks do not mask exceptions with `return` statements
- [ ] Custom exceptions inherit from appropriate base (not bare `Exception` for domain errors)
- [ ] `try` blocks are narrow — minimal code between `try` and `except`
- [ ] No `except` block that only does `pass` without a comment explaining why
- [ ] `ExceptionGroup` and `except*` used correctly on Python 3.11+ for concurrent errors
- [ ] Retry logic has backoff and a maximum attempt count

### Resource Management
<!-- activation: keywords=["open", "with", "close", "contextmanager", "resource", "connection", "socket"] -->

- [ ] All file handles, sockets, and database connections use context managers
- [ ] `@contextmanager` generators have `try/finally` to ensure cleanup on exceptions
- [ ] `__del__` is not relied upon for resource cleanup (GC timing is non-deterministic)
- [ ] `tempfile.NamedTemporaryFile` uses `delete=False` only when the caller handles cleanup
- [ ] Database cursors and connections are closed in correct order
- [ ] `asynccontextmanager` used for async resource patterns (not sync `contextmanager`)

### Async and Concurrency
<!-- activation: keywords=["async", "await", "asyncio", "threading", "multiprocessing", "concurrent"] -->

- [ ] `async def` never calls `time.sleep()` — use `asyncio.sleep()`
- [ ] `async def` never calls blocking file I/O — use `aiofiles` or `run_in_executor`
- [ ] `asyncio.gather` uses `return_exceptions=True` when partial failures are acceptable
- [ ] No `asyncio.get_event_loop()` in library code — accept loop as parameter or use `get_running_loop()`
- [ ] `TaskGroup` (3.11+) preferred over bare `create_task` for structured concurrency
- [ ] Thread-shared mutable state uses `threading.Lock` or `queue.Queue`
- [ ] CPU-bound work uses `multiprocessing` or `ProcessPoolExecutor`, not threads (GIL)
- [ ] `concurrent.futures` results are consumed — unchecked futures hide exceptions

### Idioms and Readability
<!-- activation: file_globs=["**/*.py"] -->

- [ ] Use `pathlib.Path` over `os.path.join` / string concatenation for filesystem paths
- [ ] Use `enumerate()` instead of manual counter variables in loops
- [ ] Use `zip(..., strict=True)` (3.10+) when iterables must have equal length
- [ ] Prefer `dict.get(key, default)` over `if key in dict: dict[key]` patterns
- [ ] Use structural pattern matching (`match`/`case`) where it improves clarity (3.10+)
- [ ] Dataclass `field(default_factory=list)` used instead of mutable default
- [ ] Named tuples or dataclasses preferred over bare tuples for structured returns
- [ ] No string concatenation in loops — use `str.join()` or `io.StringIO`

### Performance
<!-- activation: keywords=["performance", "slow", "optimize", "cache", "lru_cache", "profile"] -->

- [ ] `functools.lru_cache` / `cache` arguments are hashable (no lists/dicts)
- [ ] Large list comprehensions that are only iterated once should be generator expressions
- [ ] `in` checks on large collections use `set` or `dict`, not `list`
- [ ] String concatenation in tight loops replaced with `''.join()` or `io.StringIO`
- [ ] `__slots__` considered for classes with many instances
- [ ] `collections.deque` used instead of `list` for FIFO queue patterns
- [ ] N+1 query patterns caught — batch database fetches where possible
- [ ] No re-compilation of regex inside loops — compile once at module level

### Security
<!-- activation: keywords=["security", "secret", "password", "token", "auth", "sql", "inject", "pickle", "yaml", "eval", "exec"] -->

- [ ] No `pickle.loads` on untrusted input (arbitrary code execution)
- [ ] `yaml.safe_load` used instead of `yaml.load` (code execution via YAML tags)
- [ ] No `eval()` / `exec()` on user-supplied data
- [ ] `subprocess.run` uses list args, not `shell=True` with string interpolation
- [ ] SQL queries use parameterized statements, not f-string interpolation
- [ ] `hashlib` comparisons use `hmac.compare_digest` (timing-safe)
- [ ] `secrets` module used for token generation, not `random`
- [ ] `tempfile.mkstemp` or `NamedTemporaryFile` used — not predictable temp paths
- [ ] No logging of sensitive data (passwords, tokens, PII)
- [ ] HTTP requests verify TLS certificates (`verify=True` is default — check it is not disabled)

### Packaging and Build
<!-- activation: file_globs=["**/pyproject.toml", "**/setup.cfg", "**/setup.py", "**/requirements*.txt", "**/Pipfile"] -->

- [ ] Dependencies pinned in lock file; `pyproject.toml` uses compatible ranges (`>=1.0,<2`)
- [ ] `pyproject.toml` uses modern build backend (`hatchling`, `setuptools>=64`, `flit-core`)
- [ ] `python_requires` set to minimum supported version
- [ ] Entry points and console scripts declared in `[project.scripts]`
- [ ] No `setup.py` with `exec(open(...).read())` anti-pattern for version extraction
- [ ] `__version__` is single-sourced (dynamic in `pyproject.toml` or `importlib.metadata`)

## Common False Positives

- **`# type: ignore` on third-party stubs**: acceptable when the upstream library lacks type stubs and no `types-*` package exists
- **Mutable default in `dataclasses.field()`**: `field(default_factory=list)` is the correct pattern, not a mutable-default bug
- **`except Exception` in top-level entry points**: catching broadly at the outermost boundary for logging before exit is acceptable
- **`shell=True` with hardcoded strings**: safe when the command is a constant with no interpolation, though list form is still preferred
- **`assert` in test files**: `assert` in `test_*.py` is standard pytest idiom, not a validation concern
- **`Any` in private helpers**: `Any` in internal implementation details is lower risk than in public APIs

## Severity Guidance

| Finding | Severity |
|---|---|
| `eval`/`exec`/`pickle` on untrusted input | Critical |
| SQL injection via f-string | Critical |
| Hardcoded secrets in source | Critical |
| `subprocess` shell injection | Critical |
| Bare `except` that swallows errors silently | Important |
| Missing context manager for resources | Important |
| Blocking I/O in async function | Important |
| Mutable default argument | Important |
| `assert` for runtime validation | Important |
| Missing type annotations on public API | Minor |
| `os.path` instead of `pathlib` | Minor |
| Non-idiomatic loop patterns | Minor |
| `# type: ignore` without error code | Minor |

## See Also

- `security-general` — language-agnostic security review
- `lang-typescript` — when Python backend pairs with TypeScript frontend
- `testing-quality` — Python test-specific patterns (pytest, fixtures, mocking)

## Authoritative References

- [PEP 484 — Type Hints](https://peps.python.org/pep-0484/)
- [PEP 585 — Built-in Generics](https://peps.python.org/pep-0585/)
- [PEP 604 — Union Type Syntax](https://peps.python.org/pep-0604/)
- [PEP 612 — ParamSpec](https://peps.python.org/pep-0612/)
- [PEP 695 — Type Parameter Syntax](https://peps.python.org/pep-0695/)
- [Bandit Security Linter](https://bandit.readthedocs.io/)
- [mypy Documentation](https://mypy.readthedocs.io/)
- [Ruff Linter](https://docs.astral.sh/ruff/)
- [Python Packaging User Guide](https://packaging.python.org/)
