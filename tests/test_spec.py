"""Structural tests for the skill-code-review FsmSpec."""

from __future__ import annotations

from ctxr_skill_code_review.handlers import INLINE_HANDLERS
from ctxr_skill_code_review.spec import (
    SPEC_ID,
    SPEC_VERSION,
    build_spec,
    fsm,
    get_handler_ids,
    get_state_ids,
)


def test_spec_is_valid_via_engine_validator() -> None:
    """``FsmSpec.validate()`` reports valid for the canonical spec."""
    result = fsm.validate()
    assert result.valid is True, f"spec rejected: {result.errors}"
    assert result.errors == []


def test_spec_id_and_version() -> None:
    """The spec carries the documented id + version."""
    assert fsm.id == SPEC_ID == "code-reviewer"
    assert fsm.version == SPEC_VERSION == 1


def test_15_states_in_declared_order() -> None:
    """The state list matches the YAML's 14 happy-path + 1 terminal shape."""
    expected = [
        "scan_project",
        "risk_tier_triage",
        "activate_leaves",
        "tree_descend",
        "llm_trim",
        "tool_discovery",
        "dispatch_specialists",
        "collect_findings",
        "verify_coverage",
        "synthesize_release_readiness",
        "write_run_directory",
        "emit_stdout",
        "short_circuit_exit",
        "stage_a_empty",
        "terminal",
    ]
    assert get_state_ids() == expected
    assert len(fsm.states) == 15


def test_handler_ids_match_inline_handlers_dict() -> None:
    """Every inline state has a registered handler under the same id."""
    declared = sorted(get_handler_ids())
    registered = sorted(INLINE_HANDLERS.keys())
    assert declared == registered
    assert len(registered) == 9


def test_terminal_state_has_no_transitions() -> None:
    """The terminal state is a true terminal — no outgoing edges."""
    terminal = fsm.get_state("terminal")
    assert terminal.transitions == []
    assert terminal.worker is None
    assert terminal.loop is None
    assert terminal.inline is None


def test_entry_state_is_scan_project() -> None:
    """The entry point is the project-scanner worker."""
    assert fsm.entry == "scan_project"
    entry = fsm.get_state(fsm.entry)
    assert entry.worker is not None
    assert entry.worker.role == "project-scanner"


def test_inline_states_carry_response_schemas() -> None:
    """Every inline state with transitions declares a response_schema.

    The engine refuses to load an inline state with transitions but no
    schema; this asserts the spec doesn't regress.
    """
    for state in fsm.states:
        if state.inline is None:
            continue
        if state.transitions:
            assert state.inline.response_schema is not None, (
                f"inline state {state.id!r} has transitions but no response_schema"
            )


def test_build_spec_is_idempotent() -> None:
    """Two ``build_spec()`` calls produce identical hashes.

    The spec hash is the canonical envelope identity; if it varies
    across calls something non-deterministic (e.g. dict ordering, a
    time-stamp, a random uuid) snuck into the spec body.
    """
    a = build_spec()
    b = build_spec()
    assert a.hash() == b.hash()
    assert a.id == b.id
    assert len(a.states) == len(b.states)


def test_short_circuit_transition_is_correctly_guarded() -> None:
    """risk_tier_triage routes to short_circuit_exit ONLY on trivial+no signal+no overrides."""
    state = fsm.get_state("risk_tier_triage")
    # First transition is the short-circuit one.
    short_circuit = state.transitions[0]
    assert short_circuit.to == "short_circuit_exit"
    # The expression's text should mention all three predicates.
    text = (
        short_circuit.when.expression  # type: ignore[union-attr]
        if hasattr(short_circuit.when, "expression")
        else ""
    )
    assert "tier == 'trivial'" in text
    assert "len(risk_signals) == 0" in text
    assert "NOT scope_overrides_present" in text


def test_stage_a_empty_transition_when_no_activated_leaves() -> None:
    """activate_leaves routes to stage_a_empty when the activated list is empty."""
    state = fsm.get_state("activate_leaves")
    stage_a = state.transitions[0]
    assert stage_a.to == "stage_a_empty"
    assert "len(activated_leaves) == 0" in stage_a.when.expression  # type: ignore[union-attr]
