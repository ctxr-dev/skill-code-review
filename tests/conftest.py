"""Pytest fixtures shared across the skill-code-review test suite."""

from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Any

import pytest
from ctxr.fsm.core import InlineContext

# The dev-tooling under scripts/ and benchmarks/ is NOT an importable package, so
# the tests that exercise it (test_stats, test_self_test_gate, test_score_mcnemar,
# test_ingest_timings, test_ingest_verdicts) import bare module names (paths, stats,
# experiments, score, ingest_*). conftest is imported before any test module in this
# directory, so prepending those two dirs ONCE here is the single owner of that
# path setup: each test file no longer scatters its own sys.path.insert (which had
# no teardown and risked shadowing later tests with the common-name modules). The
# guard keeps it idempotent across repeated collection.
_REPO = Path(__file__).resolve().parent.parent
for _dev_dir in (_REPO / "scripts", _REPO / "benchmarks"):
    _entry = str(_dev_dir)
    if _entry not in sys.path:
        sys.path.insert(0, _entry)


@pytest.fixture
def make_ctx() -> _CtxFactory:
    """Return a builder that constructs :class:`InlineContext` quickly.

    Pytest-friendly fixture: tests call ``make_ctx(state_id="…", inputs={…})``
    instead of repeating the UUID + fsm_id boilerplate. Defaults match
    the skill's spec id so callers only override what matters per case.
    """

    def _factory(
        *,
        state_id: str = "test_state",
        inputs: dict[str, Any] | None = None,
        args: dict[str, Any] | None = None,
        fsm_id: str = "code-reviewer",
        run_id: uuid.UUID | None = None,
        iteration_n: int | None = None,
    ) -> InlineContext:
        return InlineContext(
            run_id=run_id or uuid.uuid4(),
            fsm_id=fsm_id,
            state_id=state_id,
            iteration_n=iteration_n,
            args=args or {},
            inputs=inputs or {},
        )

    return _factory


class _CtxFactory:
    """Type alias for the make_ctx fixture's return type.

    Defined as a stub class so mypy/static analyzers can name the
    callable shape; runtime resolves to the local function above.
    """

    def __call__(  # pragma: no cover - protocol stub
        self,
        *,
        state_id: str = "test_state",
        inputs: dict[str, Any] | None = None,
        args: dict[str, Any] | None = None,
        fsm_id: str = "code-reviewer",
        run_id: uuid.UUID | None = None,
        iteration_n: int | None = None,
    ) -> InlineContext: ...
