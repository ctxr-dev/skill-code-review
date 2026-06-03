"""Tests for the per-state verifier prompts + LLM panel handler.

These tests exercise three layers:

* The verifier prompt templates render cleanly through
  :class:`ctxr.fsm.core.prompts.PromptRenderer` against both an empty
  smoke context (register-time validation surface) and a fixture
  ``brief + outputs`` payload.
* The engine's structural fallback rejects mal-shaped outputs and
  passes well-shaped outputs against each worker state's response
  schema (the same gate the per-state verifier panel sits behind).
* :func:`install_verifier_handler` is idempotent: repeated calls do
  not double-register and the process-wide registration state stays
  coherent across imports.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import pytest
from ctxr.fsm.core.models import Brief, VerifierVerdict
from ctxr.fsm.core.prompts import PromptContext, PromptRenderer
from ctxr.fsm.core.verifier import (
    VerifierVote,
    get_verifier_handler,
    run_verifier,
    set_verifier_handler,
)

from ctxr_skill_code_review import verifier_handler as vh_module
from ctxr_skill_code_review.spec import fsm
from ctxr_skill_code_review.verifier_handler import (
    install_verifier_handler,
    llm_verifier_handler,
    load_verifier_prompt,
)

# PR4 dropped dispatch_specialists from this list: it is now a Loop
# state (no .worker, the inner per-batch worker is wrapped by Loop).
# Its iteration-level verification happens via the merge handler's
# no-missed-file invariant, not a verifier panel.
WORKER_STATE_IDS = [
    "scan_project",
    "tree_descend",
    "llm_trim",
    "tool_discovery",
]


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------


def _brief_for(state_id: str) -> Brief:
    """Build a minimal valid Brief snapshot for ``state_id``."""
    state = fsm.get_state(state_id)
    worker = state.worker
    assert worker is not None, f"{state_id} must be a worker state"
    return Brief(
        run_id=uuid.uuid4(),
        fsm_id=fsm.id,
        state=state_id,
        purpose=state.purpose,
        preconditions=list(state.preconditions),
        inputs={},
        outputs_expected=list(state.outputs),
        post_validations=list(state.post_validations),
        transitions=[],
        has_worker=True,
        has_loop=False,
        allowed_tools=list(state.allowed_tools),
        worker=worker,
        loop=None,
        gate=None,
        iteration_n=None,
        outputs_path=None,
        brief_id=uuid.uuid4(),
    )


def _good_outputs(state_id: str) -> dict[str, Any]:
    """Return schema-valid outputs for the given worker state."""
    if state_id == "scan_project":
        return {
            "project_profile": {
                "languages": ["python"],
                "frameworks": ["web"],
                "monorepo": False,
            },
            "changed_paths": ["src/api/auth.py"],
            "diff_stats": {"lines_changed": 12, "files_changed": 1},
        }
    if state_id == "tree_descend":
        return {
            "stage_a_candidates": [
                {
                    "id": "lang-python",
                    "path": "reviewers.wiki/lang-python.md",
                    "activation_match": ["file_globs"],
                }
            ],
            "descent_path": ["root", "languages"],
        }
    if state_id == "llm_trim":
        return {
            "picked_leaves": [
                {
                    "id": "lang-python",
                    "path": "reviewers.wiki/lang-python.md",
                    "justification": "diff touches python files",
                    "dimensions": ["correctness"],
                }
            ],
            "rejected_leaves": [],
            "coverage_rescues": [],
        }
    if state_id == "tool_discovery":
        return {
            "tool_results": [
                {
                    "name": "ruff",
                    "status": "pass",
                    "findings": 0,
                    "output": "ok",
                }
            ]
        }
    if state_id == "dispatch_specialists":
        return {
            "specialist_outputs": [
                {
                    "id": "lang-python",
                    "status": "completed",
                    "findings": [
                        {
                            "severity": "minor",
                            "file": "src/api/auth.py",
                            "title": "trailing whitespace",
                        }
                    ],
                }
            ]
        }
    raise ValueError(f"unknown state_id: {state_id}")


def _bad_outputs(state_id: str) -> dict[str, Any]:
    """Return schema-INVALID outputs that the structural verifier rejects."""
    if state_id == "scan_project":
        # `languages` empty (violates minItems=1).
        return {
            "project_profile": {
                "languages": [],
                "frameworks": [],
                "monorepo": False,
            },
            "changed_paths": [],
            "diff_stats": {"lines_changed": 0, "files_changed": 0},
        }
    if state_id == "tree_descend":
        # Candidate missing `activation_match` entirely.
        return {
            "stage_a_candidates": [
                {"id": "lang-python", "path": "x"}
            ],
            "descent_path": [],
        }
    if state_id == "llm_trim":
        # Picked leaf missing `justification`.
        return {
            "picked_leaves": [
                {
                    "id": "lang-python",
                    "path": "x",
                    "dimensions": ["correctness"],
                }
            ],
            "rejected_leaves": [],
            "coverage_rescues": [],
        }
    if state_id == "tool_discovery":
        # `status` outside the closed set.
        return {
            "tool_results": [
                {"name": "ruff", "status": "weird", "findings": 0, "output": ""}
            ]
        }
    if state_id == "dispatch_specialists":
        # Finding `severity` outside the taxonomy.
        return {
            "specialist_outputs": [
                {
                    "id": "lang-python",
                    "status": "completed",
                    "findings": [
                        {
                            "severity": "catastrophic",
                            "file": "src/api/auth.py",
                            "title": "x",
                        }
                    ],
                }
            ]
        }
    raise ValueError(f"unknown state_id: {state_id}")


@pytest.fixture(autouse=True)
def _reset_verifier_handler() -> Any:
    """Ensure each test starts with the engine's structural fallback active."""
    set_verifier_handler(None)
    # Also reset the install flag + dispatcher inside the module so
    # idempotency tests start from a clean slate.
    vh_module._INSTALLED = False  # type: ignore[attr-defined]
    saved_dispatcher = vh_module._DISPATCHER  # type: ignore[attr-defined]
    vh_module._DISPATCHER = None  # type: ignore[attr-defined]
    yield
    set_verifier_handler(None)
    vh_module._INSTALLED = False  # type: ignore[attr-defined]
    vh_module._DISPATCHER = saved_dispatcher  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# Prompt rendering — one parameterized test per state
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("state_id", WORKER_STATE_IDS)
def test_verifier_prompt_renders_against_fixture(state_id: str) -> None:
    """Each verifier prompt renders cleanly with a fixture brief + outputs."""
    template = load_verifier_prompt(state_id)
    renderer = PromptRenderer(allow_model_import=False)

    # Smoke render (empty context) — mirrors register-time validation.
    renderer.validate(template, state_id=state_id)

    # Full render with a populated metadata payload.
    brief = _brief_for(state_id)
    outputs = _good_outputs(state_id)
    ctx = PromptContext(
        state_id=state_id,
        state_kind="verifier",
        metadata={
            "brief": brief.model_dump(mode="json"),
            "outputs": outputs,
        },
    )
    rendered = renderer.render(template, ctx)

    # Required tokens: the prompt must echo BOTH the brief and outputs
    # JSON envelopes so the LLM judge can see what it is verifying.
    assert "Brief" in rendered or "brief" in rendered
    assert "Outputs" in rendered or "outputs" in rendered
    assert "verdict" in rendered
    assert "passed" in rendered
    assert "rejected" in rendered
    # The fixture outputs payload should land inside the rendered text.
    # We don't assert byte-equality (formatting differs across filter
    # versions) but at least one distinctive token must survive.
    first_key = next(iter(outputs.keys()))
    assert first_key in rendered


# ---------------------------------------------------------------------------
# Structural fallback — rejects bad outputs, passes good ones
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("state_id", WORKER_STATE_IDS)
def test_structural_verifier_rejects_bad_outputs(state_id: str) -> None:
    """The engine's structural fallback rejects schema-invalid outputs.

    This is the always-on safety net the per-state verifier panel sits
    behind: even when no LLM panel is wired, malformed worker output
    cannot slip through.
    """
    state = fsm.get_state(state_id)
    assert state.verifier is not None
    brief = _brief_for(state_id)
    outcome = run_verifier(state.verifier, brief, _bad_outputs(state_id))
    assert outcome.verdict is VerifierVerdict.rejected
    assert outcome.rejected_count == state.verifier.parallel_count


@pytest.mark.parametrize("state_id", WORKER_STATE_IDS)
def test_structural_verifier_passes_clean_outputs(state_id: str) -> None:
    """Well-formed outputs pass the structural fallback unanimously."""
    state = fsm.get_state(state_id)
    assert state.verifier is not None
    brief = _brief_for(state_id)
    outcome = run_verifier(state.verifier, brief, _good_outputs(state_id))
    assert outcome.verdict is VerifierVerdict.passed
    assert outcome.passed_count == state.verifier.parallel_count


# ---------------------------------------------------------------------------
# LLM panel aggregation — mock 2/3 rejected
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("state_id", WORKER_STATE_IDS)
def test_llm_panel_majority_rejected(state_id: str) -> None:
    """A mocked 2-of-3-rejected dispatcher produces an aggregate rejection."""
    state = fsm.get_state(state_id)
    assert state.verifier is not None

    call_count = {"n": 0}

    def fake_dispatcher(prompt: str, context: dict[str, Any]) -> str:
        call_count["n"] += 1
        # First two votes reject, third passes — majority is "rejected".
        if call_count["n"] <= 2:
            return json.dumps({"verdict": "rejected", "reason": "test reject"})
        return json.dumps({"verdict": "passed", "reason": "test ok"})

    vh_module._DISPATCHER = fake_dispatcher  # type: ignore[attr-defined]
    set_verifier_handler(llm_verifier_handler)

    brief = _brief_for(state_id)
    outcome = run_verifier(state.verifier, brief, _good_outputs(state_id))

    assert outcome.parallel_count == 3
    assert outcome.passed_count == 1
    assert outcome.rejected_count == 2
    assert outcome.verdict is VerifierVerdict.rejected
    assert call_count["n"] == 3


@pytest.mark.parametrize("state_id", WORKER_STATE_IDS)
def test_llm_panel_majority_passed(state_id: str) -> None:
    """A unanimous-pass dispatcher produces an aggregate passed verdict."""
    state = fsm.get_state(state_id)
    assert state.verifier is not None

    def fake_dispatcher(prompt: str, context: dict[str, Any]) -> str:
        return json.dumps({"verdict": "passed", "reason": "looks fine"})

    vh_module._DISPATCHER = fake_dispatcher  # type: ignore[attr-defined]
    set_verifier_handler(llm_verifier_handler)

    brief = _brief_for(state_id)
    outcome = run_verifier(state.verifier, brief, _good_outputs(state_id))

    assert outcome.verdict is VerifierVerdict.passed
    assert outcome.passed_count == 3


def test_llm_panel_malformed_response_fails_closed() -> None:
    """A dispatcher returning non-JSON yields rejected votes, not a crash."""
    state = fsm.get_state("scan_project")
    assert state.verifier is not None

    def fake_dispatcher(prompt: str, context: dict[str, Any]) -> str:
        return "definitely not JSON"

    vh_module._DISPATCHER = fake_dispatcher  # type: ignore[attr-defined]
    set_verifier_handler(llm_verifier_handler)

    brief = _brief_for("scan_project")
    outcome = run_verifier(state.verifier, brief, _good_outputs("scan_project"))
    assert outcome.verdict is VerifierVerdict.rejected
    assert outcome.rejected_count == 3
    for vote in outcome.votes:
        assert isinstance(vote, VerifierVote)
        assert "verifier_response_not_json" in vote.reason


# ---------------------------------------------------------------------------
# Installer idempotency
# ---------------------------------------------------------------------------


def test_install_verifier_handler_no_dispatcher_returns_false() -> None:
    """Without a dispatcher, install_verifier_handler leaves the fallback live."""
    assert vh_module._DISPATCHER is None  # type: ignore[attr-defined]
    installed = install_verifier_handler()
    assert installed is False
    # The engine's getter must still return None (structural fallback).
    assert get_verifier_handler() is None


def test_install_verifier_handler_idempotent() -> None:
    """Calling install_verifier_handler twice does not double-register."""

    def fake_dispatcher(prompt: str, context: dict[str, Any]) -> str:
        return json.dumps({"verdict": "passed", "reason": "ok"})

    vh_module._DISPATCHER = fake_dispatcher  # type: ignore[attr-defined]

    first = install_verifier_handler()
    second = install_verifier_handler()

    assert first is True
    assert second is True
    assert get_verifier_handler() is llm_verifier_handler
