"""Tests for handle_activate_leaves and the activation gate."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from ctxr_skill_code_review.handlers import (
    _enumerate_wiki_leaves,
    _evaluate_activation,
    _minimatch,
    handle_activate_leaves,
)

# ---------------------------------------------------------------------------
# Pure-function tests for the activation gate (no filesystem).
# ---------------------------------------------------------------------------


def test_minimatch_star_single_segment() -> None:
    assert _minimatch("src/a.py", "src/*") is True
    assert _minimatch("src/sub/a.py", "src/*") is False


def test_minimatch_double_star() -> None:
    assert _minimatch("src/sub/a.py", "src/**") is True
    assert _minimatch("src/sub/deep/a.py", "**/*.py") is True
    assert _minimatch("src/a.py", "**/*.py") is True


def test_minimatch_brace_alternation() -> None:
    assert _minimatch("src/a.py", "src/{a,b}.py") is True
    assert _minimatch("src/b.py", "src/{a,b}.py") is True
    assert _minimatch("src/c.py", "src/{a,b}.py") is False


def test_evaluate_activation_file_globs() -> None:
    leaves = [
        {"id": "py-leaf", "activation": {"file_globs": ["**/*.py"]}},
        {"id": "ts-leaf", "activation": {"file_globs": ["**/*.ts"]}},
    ]
    activated, signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=["src/x.py"],
        project_profile={},
        diff_text="",
    )
    ids = [leaf["id"] for leaf in activated]
    assert ids == ["py-leaf"]
    assert signals["py-leaf"] == ["file_globs"]


def test_evaluate_activation_keyword_matches() -> None:
    leaves = [
        {
            "id": "sec-csrf",
            "activation": {"keyword_matches": ["csrf"]},
        }
    ]
    activated, signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=[],
        project_profile={},
        diff_text="+ added CSRF token validation",
    )
    assert [leaf["id"] for leaf in activated] == ["sec-csrf"]
    assert signals["sec-csrf"] == ["keyword_matches"]


def test_evaluate_activation_structural_signals() -> None:
    leaves = [
        {
            "id": "fw-django",
            "activation": {"structural_signals": ["django"]},
        }
    ]
    activated, signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=[],
        project_profile={"frameworks": ["django"]},
        diff_text="",
    )
    assert [leaf["id"] for leaf in activated] == ["fw-django"]
    assert signals["fw-django"] == ["structural_signals"]


def test_evaluate_activation_escalation_from() -> None:
    leaves = [
        {"id": "parent", "activation": {"file_globs": ["**/*.py"]}},
        {"id": "child", "activation": {"escalation_from": ["parent"]}},
    ]
    activated, signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=["a.py"],
        project_profile={},
        diff_text="",
    )
    ids = sorted(leaf["id"] for leaf in activated)
    assert ids == ["child", "parent"]
    assert signals["child"] == ["escalation_from"]


def test_evaluate_activation_skips_leaves_without_id() -> None:
    leaves: list[dict[str, Any]] = [
        {"activation": {"file_globs": ["**/*.py"]}},  # no id
        {"id": "", "activation": {"file_globs": ["**/*.py"]}},  # empty id
        {"id": "ok", "activation": {"file_globs": ["**/*.py"]}},
    ]
    activated, _ = _evaluate_activation(
        leaves=leaves,
        changed_paths=["a.py"],
        project_profile={},
        diff_text="",
    )
    assert [leaf["id"] for leaf in activated] == ["ok"]


# ---------------------------------------------------------------------------
# Filesystem-touching tests use the real bundled reviewers.wiki/ corpus.
# ---------------------------------------------------------------------------


def test_enumerate_wiki_leaves_against_real_corpus() -> None:
    """The skill ships with reviewers.wiki/; the walk should return >0 leaves."""
    skill_root = Path(__file__).resolve().parent.parent.parent
    leaves = _enumerate_wiki_leaves(skill_root)
    assert len(leaves) > 0
    # Every leaf has an id + path.
    for leaf in leaves[:5]:
        assert isinstance(leaf["id"], str) and leaf["id"]
        assert isinstance(leaf["path"], str) and leaf["path"]


def test_handle_activate_leaves_runs_against_real_corpus(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """End-to-end smoke: handler reads the wiki, returns activated leaves."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["src/auth.py"],
            "args": {},
        },
        args={},
    )
    result = handle_activate_leaves(ctx)
    assert "activated_leaves" in result
    assert isinstance(result["activated_leaves"], list)
    # Don't assert a specific count — the corpus changes over time.
    # Asserting "no crash + valid shape" is the contract.


def test_handle_activate_leaves_handles_missing_wiki(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, make_ctx
) -> None:  # type: ignore[no-untyped-def]
    """A skill_root without reviewers.wiki/ returns an empty list, no crash."""
    from ctxr_skill_code_review import handlers as h

    monkeypatch.setattr(h, "_resolve_skill_root", lambda: tmp_path)
    ctx = make_ctx(
        inputs={
            "project_profile": {},
            "changed_paths": [],
        },
        args={},
    )
    result = handle_activate_leaves(ctx)
    assert result == {"activated_leaves": []}
