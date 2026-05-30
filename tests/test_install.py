"""Tests for the install helper."""

from __future__ import annotations

from pathlib import Path

from ctxr.fsm.core import get_default_registry

from ctxr_skill_code_review.handlers import INLINE_HANDLERS
from ctxr_skill_code_review.install import register
from ctxr_skill_code_review.spec import SPEC_ID


def test_register_returns_envelope(tmp_path: Path) -> None:
    """First registration creates the spec + wires handlers."""
    db = tmp_path / "fsm.db"
    result = register(project_db=db)
    assert result["spec_id"] == SPEC_ID
    assert result["spec_version"] == 1
    assert result["spec_created"] is True
    assert result["handlers_registered"] == len(INLINE_HANDLERS)
    assert result["db_path"] == str(db.resolve())
    # Handlers should now be live in the process-wide registry.
    registry = get_default_registry()
    for handler_id in INLINE_HANDLERS:
        assert registry.lookup(SPEC_ID, handler_id) is not None


def test_register_is_idempotent(tmp_path: Path) -> None:
    """Re-registering the same spec body is a no-op at the DB layer."""
    db = tmp_path / "fsm.db"
    first = register(project_db=db)
    second = register(project_db=db)
    assert first["spec_version"] == second["spec_version"]
    # The second call MUST NOT bump the version when the spec body is
    # byte-identical (content-addressed by the FSM spec repo).
    assert second["spec_created"] is False
    # Handlers always re-register so handlers_registered stays the same.
    assert second["handlers_registered"] == len(INLINE_HANDLERS)
