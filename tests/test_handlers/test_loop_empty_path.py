"""End-to-end coverage for the PR6 0-batch loop-skip path.

When the planner emits ``total_batches == 0`` (because llm_trim picked
no leaves), the spec routes the engine straight from
``plan_specialist_batches`` to ``merge_specialist_outputs``, skipping
``dispatch_specialists`` (the Loop) entirely.

The test drives the FSM through the inline + simulated-worker path
identical to ``test_end_to_end`` but with ``picked_leaves=[]`` so that
the planner emits 0 batches. It asserts:

* ``dispatch_specialists`` is NOT visited.
* ``merge_specialist_outputs`` IS visited and emits an empty
  ``specialist_outputs`` list (with no MissedFileError).
* The terminal state is reached cleanly (no engine fault, no
  MissedFileError); the merger emits an empty
  ``specialist_outputs`` list and downstream synthesis treats the
  unreviewed diff as a coverage violation (verdict NO-GO is the
  correct safe default when llm_trim selected zero leaves).
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from ctxr.fsm.core.engine import advance as engine_advance
from ctxr.fsm.core.engine import execute_inline
from ctxr.fsm.core.inline_registry import InlineHandlerRegistry
from ctxr.fsm.core.models import RunCtx

from ctxr_skill_code_review.handlers import INLINE_HANDLERS
from ctxr_skill_code_review.spec import SPEC_ID, fsm


def _simulated_worker_output_zero_picked(state_id: str) -> dict[str, Any]:
    """Mirror tests/test_end_to_end._simulated_worker_output but with
    llm_trim returning an EMPTY picked_leaves list — the upstream
    condition that produces total_batches == 0.
    """
    if state_id == "scan_project":
        return {
            "project_profile": {
                "languages": ["python"],
                "frameworks": [],
                "monorepo": False,
            },
            "changed_paths": ["src/example.py"],
            "diff_stats": {"lines_changed": 50, "files_changed": 1},
        }
    if state_id == "tree_descend":
        # A candidate exists but llm_trim will reject it below.
        return {
            "stage_a_candidates": [
                {
                    "id": "example-leaf",
                    "path": "example-leaf.md",
                    "activation_match": ["file_globs"],
                }
            ],
            "descent_path": ["root", "example"],
        }
    if state_id == "llm_trim":
        # The trigger condition for PR6: llm_trim picks zero leaves.
        return {
            "picked_leaves": [],
            "rejected_leaves": [
                {
                    "id": "example-leaf",
                    "path": "example-leaf.md",
                    "reason": "out of scope for this diff",
                }
            ],
            "coverage_rescues": [],
        }
    if state_id == "tool_discovery":
        return {"tool_results": []}
    if state_id == "rank_findings":
        return {
            "findings": [],
            "severity_counts": {"critical": 0, "important": 0, "minor": 0},
        }
    if state_id == "dispatch_specialists":
        # Should NEVER be reached on the 0-batch path. If we end up here
        # the spec's PR6 short-circuit transition is broken.
        raise AssertionError(
            "dispatch_specialists must not be entered when total_batches == 0"
        )
    raise KeyError(f"no simulated output for state {state_id!r}")


def test_zero_picked_leaves_skips_loop_and_reaches_terminal(tmp_path: Path) -> None:
    """Drive the spec from entry to terminal with picked_leaves=[]."""
    registry = InlineHandlerRegistry()
    registry.register_many(SPEC_ID, INLINE_HANDLERS)

    run_id = uuid.uuid4()
    env: dict[str, Any] = {
        "args": {"project_root": str(tmp_path), "base": "BASE", "head": "HEAD"},
    }
    current_state = fsm.entry
    visited: list[str] = []
    max_steps = 64

    for step in range(max_steps):
        state = fsm.get_state(current_state)
        visited.append(current_state)
        if state.kind == "terminal":
            break

        if state.kind == "inline":
            ctx = RunCtx(
                run_id=run_id,
                fsm_id=fsm.id,
                current_state=state.id,
                env=env,
            )
            result = execute_inline(
                state=state,
                ctx=ctx,
                args=env.get("args", {}),
                inputs=env,
                registry=registry,
            )
            assert result.ok, (
                f"inline state {state.id} faulted: {result.fault_reason}"
            )
            outputs = result.outputs
        else:
            outputs = _simulated_worker_output_zero_picked(state.id)

        ctx = RunCtx(
            run_id=run_id,
            fsm_id=fsm.id,
            current_state=state.id,
            env=env,
        )
        advance_result = engine_advance(fsm, ctx, outputs)
        assert advance_result.kind != "fault", (
            f"engine faulted at {state.id} step {step}: "
            f"{advance_result.reason} errors={advance_result.errors}"
        )
        env = {**env, **outputs}
        if advance_result.kind == "terminal":
            visited.append("terminal")
            break
        current_state = advance_result.next_state or ""
    else:
        raise AssertionError(
            f"FSM did not reach terminal within {max_steps} steps; visited={visited}"
        )

    # PR6 assertion: the Loop is skipped.
    assert "dispatch_specialists" not in visited, (
        f"dispatch_specialists must not be visited on the 0-batch path; "
        f"visited={visited}"
    )
    # PR6 assertion: the merger still runs (so collect_findings has
    # something to consume, even if the list is empty).
    assert "merge_specialist_outputs" in visited, (
        f"merge_specialist_outputs must still run; visited={visited}"
    )
    # The pipeline still reaches terminal cleanly.
    assert visited[-1] == "terminal"
    # The empty-merger path produced an empty specialist_outputs list.
    assert env.get("specialist_outputs") == []
    # No findings -> no per-finding coverage credit; no leaves -> no
    # per-leaf coverage credit -> coverage rule is violated -> NO-GO
    # is the correct conservative verdict. (The point of the PR6
    # short-circuit is that we still REACH the verdict gate cleanly
    # instead of stalling in an empty Loop.)
    assert env.get("coverage_rule_violated") is True
    assert env.get("verdict") == "NO-GO"
