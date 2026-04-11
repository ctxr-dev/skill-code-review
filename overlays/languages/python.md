---
tools:
  - name: mypy
    command: "mypy --output json ."
    purpose: "Python static type checker"
  - name: ruff
    command: "ruff check --output-format json ."
    purpose: "Fast Python linter (replaces flake8, isort, pyupgrade)"
  - name: bandit
    command: "bandit -r . -f json"
    purpose: "Python security linter"
---

# Python — Review Overlay

Load this overlay for the **Type Safety**, **Reliability**, and **Maintainability** specialists when Python code is being reviewed.

## Type Hints

- [ ] Every public function and method has type annotations on all parameters and the return type; `-> None` is explicit, not omitted
- [ ] `Any` from `typing` is avoided; use `object` for truly unknown types and narrow with `isinstance` guards
- [ ] Optional values use `T | None` (Python 3.10+) or `Optional[T]`; bare `None` as a default without a type annotation is absent from typed code
- [ ] `TypedDict`, `dataclass`, or `attrs` is used for structured data rather than untyped `dict` passed between functions
- [ ] `mypy` or `pyright` is configured in strict mode and runs in CI; inline `# type: ignore` comments include a reason

## Resource Management

- [ ] File handles, sockets, database connections, and locks are opened inside `with` statements; no manual `.close()` calls that can be skipped on exception
- [ ] `contextlib.contextmanager` is used to turn generator-based cleanup into a proper context manager; bare `try/finally` patterns are refactored
- [ ] Async resources use `async with` (e.g., `aiohttp.ClientSession`); sessions are not created per-call in a hot path

## Data Structures and Defaults

- [ ] Mutable default arguments (`def f(x=[])`, `def f(x={})`) are absent; use `None` as the default and initialize inside the function body
- [ ] `dataclasses.field(default_factory=list)` is used for mutable defaults in dataclasses
- [ ] `__all__` is defined in public modules to explicitly declare the exported API surface

## Idiomatic Python

- [ ] `pathlib.Path` is used for all file system path manipulation; `os.path` string operations are replaced
- [ ] Generators and `itertools` are used for large or lazy sequences; materializing with `list()` is intentional and sized
- [ ] f-strings are used for string formatting; `%` formatting and `.format()` are replaced in new code
- [ ] `logging` is used instead of `print` for any output that is not user-facing CLI output; log calls include a logger name (`logging.getLogger(__name__)`)
- [ ] `except Exception` catches are narrowed to specific exception types; bare `except:` (catching `BaseException`) is absent

## Error Handling

- [ ] Custom exceptions subclass a domain-specific base class rather than `Exception` directly, enabling targeted `except` clauses
- [ ] Exception messages include context (e.g., the value that caused the failure) to aid debugging
- [ ] `raise` (without argument) is used inside `except` blocks to re-raise with the original traceback preserved; `raise e` that drops the chain is replaced with `raise ... from e`
