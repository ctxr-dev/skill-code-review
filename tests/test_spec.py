"""Structural tests for the skill-code-review FsmSpec."""

from __future__ import annotations

from code_review.handlers import INLINE_HANDLERS
from code_review.spec import (
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


def test_18_states_in_declared_order() -> None:
    """The PR5 18-state shape: PR4's 17 + the new verifier_stuck inline state."""
    expected = [
        "scan_project",
        "risk_tier_triage",
        "activate_leaves",
        "tree_descend",
        "llm_trim",
        "tool_discovery",
        "plan_specialist_batches",
        "dispatch_specialists",
        "merge_specialist_outputs",
        "collect_findings",
        "rank_findings",
        "verify_coverage",
        "synthesize_release_readiness",
        "write_run_directory",
        "emit_stdout",
        "short_circuit_exit",
        "stage_a_empty",
        "verifier_stuck",
        "terminal",
    ]
    assert get_state_ids() == expected
    assert len(fsm.states) == 19


def test_handler_ids_match_inline_handlers_dict() -> None:
    """Every inline state has a registered handler under the same id."""
    declared = sorted(get_handler_ids())
    registered = sorted(INLINE_HANDLERS.keys())
    assert declared == registered
    assert len(registered) == 12


def test_plan_and_merge_states_present() -> None:
    """PR4: plan_specialist_batches and merge_specialist_outputs join the spec."""
    state_ids = {s.id for s in fsm.states}
    assert "plan_specialist_batches" in state_ids
    assert "merge_specialist_outputs" in state_ids


def test_dispatch_specialists_is_a_loop_state() -> None:
    """PR4: dispatch_specialists becomes a Loop with max_iterations=64 + done_field='loop_done'."""
    state = fsm.get_state("dispatch_specialists")
    assert state.loop is not None
    assert state.loop.max_iterations == 64
    assert state.loop.done_field == "loop_done"
    assert state.loop.worker.role == "specialist-batch"


def test_plan_to_dispatch_to_merge_to_collect_chain() -> None:
    """PR4/PR5 transition chain: tool_discovery -> plan -> dispatch (loop) -> merge -> collect_findings.

    PR5 prepends a verifier_stuck escape hatch on every worker state,
    so the always-transition is now the LAST entry, not the first.
    """

    def _always_target(state_id: str) -> str:
        """Return the destination of the always/otherwise transition."""
        return next(
            t.to for t in fsm.get_state(state_id).transitions
            if str(getattr(t.when, "value", t.when)).lower() in {"always", "otherwise"}
        )

    assert _always_target("tool_discovery") == "plan_specialist_batches"
    assert _always_target("plan_specialist_batches") == "dispatch_specialists"
    assert _always_target("dispatch_specialists") == "merge_specialist_outputs"
    assert _always_target("merge_specialist_outputs") == "collect_findings"


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


def test_worker_states_have_allowed_tools_pinned() -> None:
    """Each worker state pins an `allowed_tools` allowlist per the spec.

    The allowlist is the tool surface forwarded to the dispatched
    sub-agent. Four worker states expose lists (``llm_trim`` is empty
    because it is pure reasoning over the brief). PR4 converted
    ``dispatch_specialists`` into a Loop, so its allowlist now lives on
    the loop-state envelope (still asserted below) rather than under
    ``state.worker``. Inline / terminal states keep the default empty
    list — they never see a sub-agent.
    """
    expected: dict[str, list[str]] = {
        "scan_project": [
            "Bash(git diff:*)",
            "Bash(git log:*)",
            "Bash(git status:*)",
            "Bash(git ls-files:*)",
            "Bash(cat:*)",
            "Read",
            "Glob",
        ],
        "tree_descend": ["Read"],
        "llm_trim": [],
        "tool_discovery": [
            "Bash(eslint:*)",
            "Bash(ruff:*)",
            "Bash(mypy:*)",
            "Bash(npm test:*)",
            "Bash(pytest:*)",
            "Bash(cargo:*)",
            "Bash(go test:*)",
            "Bash(which:*)",
            "Read",
        ],
        "rank_findings": [],
    }
    worker_state_ids = {
        state.id for state in fsm.states if state.worker is not None
    }
    assert worker_state_ids == set(expected.keys()), (
        f"worker-state set drifted: got {sorted(worker_state_ids)}"
    )
    for state_id, want in expected.items():
        got = fsm.get_state(state_id).allowed_tools
        assert got == want, (
            f"{state_id}: allowed_tools drift — got {got}, want {want}"
        )
    # Worker states other than the pure-reasoning ones (`llm_trim`,
    # `rank_findings`) must carry a non-empty allowlist.
    pure_reasoning = {"llm_trim", "rank_findings"}
    for state_id, want in expected.items():
        if state_id in pure_reasoning:
            assert want == [], f"{state_id} allowlist must stay empty"
        else:
            assert len(want) > 0, f"{state_id} allowlist unexpectedly empty"
    # PR4: dispatch_specialists is now a Loop state. Its allowlist lives
    # on the loop-state envelope and must include Task so the loop body
    # can fan out per-unit sub-agents.
    ds_tools = fsm.get_state("dispatch_specialists").allowed_tools
    assert "Task" in ds_tools
    for tool in ("Read", "Grep", "Glob", "WebFetch"):
        assert tool in ds_tools


def test_each_worker_has_verifier() -> None:
    """Every worker state ships a 3-voter / 2-majority verifier panel.

    PR4 converted dispatch_specialists into a Loop, so the worker count
    drops from 5 to 4 (scan_project, tree_descend, llm_trim,
    tool_discovery). The Loop's inner worker is not directly subject to
    a verifier in this revision — verification of per-iteration outputs
    happens via the merger's no-missed-file invariant.
    """
    worker_states = [s for s in fsm.states if s.worker is not None]
    assert len(worker_states) == 5, (
        "spec must ship 5 (non-loop) worker states: scan_project, tree_descend, "
        "llm_trim, tool_discovery, rank_findings"
    )
    for state in worker_states:
        assert state.verifier is not None, (
            f"worker state {state.id!r} is missing its verifier panel"
        )
        assert state.verifier.parallel_count == 3, (
            f"{state.id} verifier must use 3 parallel votes"
        )
        assert state.verifier.majority_threshold == 2, (
            f"{state.id} verifier must require 2 of 3 passing votes"
        )
        assert state.verifier.role == f"verify-{state.id}", (
            f"{state.id} verifier role drift: got {state.verifier.role!r}"
        )


# ---------------------------------------------------------------------------
# PR6: plan_specialist_batches gains a guard predicate + a 0-batch skip edge
# ---------------------------------------------------------------------------


def test_plan_specialist_batches_has_two_outgoing_transitions() -> None:
    """PR6: plan -> (merge when 0 batches) OR (dispatch otherwise).

    Before PR6 there was a single always-transition into the Loop. The
    new edge lets us short-circuit an empty Loop when picked_leaves is
    empty (which happens when llm_trim picks nothing OR when an env
    threading bug drops picked_leaves between states).
    """
    state = fsm.get_state("plan_specialist_batches")
    assert len(state.transitions) == 2, (
        f"plan_specialist_batches must have 2 outgoing transitions; got "
        f"{[(t.to, t.when) for t in state.transitions]}"
    )
    # First (guarded) edge: 0 batches -> merge_specialist_outputs.
    first = state.transitions[0]
    assert first.to == "merge_specialist_outputs"
    assert hasattr(first.when, "expression"), (
        "the 0-batch edge must be predicate-guarded, not an always-transition"
    )
    assert "total_batches == 0" in first.when.expression  # type: ignore[union-attr]
    # Second (always) edge: dispatch the Loop.
    second = state.transitions[1]
    assert second.to == "dispatch_specialists"
    assert str(getattr(second.when, "value", second.when)).lower() in {
        "always",
        "otherwise",
    }


def test_plan_specialist_batches_post_validation_guards_total_batches() -> None:
    """PR6: register-time guard that catches the env-threading regression.

    If picked_leaves is non-empty but the planner emits 0 batches, the
    handler was fed an empty picked_leaves by an upstream bug. The
    post_validation
    ``(len(picked_leaves) == 0) OR (total_batches > 0)`` makes that
    failure surface here loudly instead of silently flowing 0 work into
    the Loop.
    """
    state = fsm.get_state("plan_specialist_batches")
    assert state.inline is not None
    expressions = [p.expression for p in state.inline.post_validations]
    assert any(
        "len(picked_leaves) == 0" in expr and "total_batches > 0" in expr
        for expr in expressions
    ), (
        f"plan_specialist_batches must carry the planner-vs-picked_leaves "
        f"guard predicate; got {expressions}"
    )


def test_dispatch_specialists_worker_inputs_include_picked_leaves() -> None:
    """PR6: the Loop body needs picked_leaves to review each unit.

    The Loop's worker dispatches a sub-agent per iteration; it must
    receive the leaf-level metadata (purpose, dimensions, justification)
    so the sub-agent can carry out the review the leaf specifies, not
    just iterate file lists in the batch envelope.
    """
    state = fsm.get_state("dispatch_specialists")
    assert state.loop is not None
    assert "picked_leaves" in state.loop.worker.inputs, (
        f"dispatch_specialists.loop.worker.inputs must include "
        f"picked_leaves; got {state.loop.worker.inputs}"
    )
