"""skill-code-review v3 — Python ctxr-fsm port.

This package replaces the legacy Node orchestrator (run-review.mjs +
scripts/inline-states/*.mjs + fsm/code-reviewer.fsm.yaml + the 5 worker
prompt files) with:

* :mod:`code_review.spec` — the Pydantic :class:`~ctxr.fsm.FsmSpec`
  literal that mirrors the YAML 1:1 (15 states, 8 worker schemas, 9 inline
  states, 1 terminal).
* :mod:`code_review.handlers` — the 9 deterministic Python
  callables that run inside :func:`ctxr.fsm.execute_inline`.
* :mod:`code_review.workers` — the 5 worker prompt `.md`
  templates the FSM hands to dispatched sub-agents.
* :mod:`code_review.install` — the one-shot
  :func:`~code_review.install.register` function that wires
  the spec + handlers into a ctxr-fsm project DB.

Public symbols re-exported from this top-level module are stable across
3.x releases. Internal helpers live behind underscores and are subject
to change.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from code_review.handlers import INLINE_HANDLERS
from code_review.spec import (
    SPEC_ID,
    SPEC_VERSION,
    HandlerId,
    ReviewVerdict,
    RiskTier,
    Severity,
    build_spec,
    fsm,
)

__version__ = "3.0.0"

# ``register`` is published as a lazy attribute so that
# ``python -m code_review.install`` does NOT trigger the
# CPython runpy warning about a module being importable at package
# load time AND then re-executed under ``__main__``. Importing
# ``install`` here would trip the warning; deferring keeps the
# top-level package light and the CLI invocation clean.
if TYPE_CHECKING:
    from code_review.install import register
else:

    def __getattr__(name: str) -> Any:
        if name == "register":
            from code_review.install import register as _register

            return _register
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "INLINE_HANDLERS",
    "SPEC_ID",
    "SPEC_VERSION",
    "HandlerId",
    "ReviewVerdict",
    "RiskTier",
    "Severity",
    "__version__",
    "build_spec",
    "fsm",
    "register",
]
