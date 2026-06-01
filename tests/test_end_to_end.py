"""End-to-end smoke: drive the skill-code-review FSM through inline + simulated worker steps.

The simulated worker dispatcher mimics what a real LLM sub-agent
would return for each worker state. The actual engine runs inline
states server-side; we drive `engine.advance` directly and validate
the resulting state tree shape.

This test does NOT assert byte-equality of report.md against a frozen
fixture (that's W14h's consistency battery); it asserts:

* The engine reaches the terminal state via the expected happy-path
  state sequence.
* All inline-handler outputs match their declared response schemas.
* The on-disk report.md / report.json / manifest.json are written.
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


def _simulated_worker_output(state_id: str) -> dict[str, Any]:
    """Fixed responses for each of the 5 worker states.

    The shapes match each state's response_schema; values are minimal
    so the FSM has a deterministic happy path through the spec.
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
        return {
            "picked_leaves": [
                {
                    "id": "example-leaf",
                    "path": "example-leaf.md",
                    "justification": "Picked because the diff touches Python files.",
                    "dimensions": ["correctness"],
                }
            ],
            "rejected_leaves": [],
            "coverage_rescues": [],
        }
    if state_id == "tool_discovery":
        return {"tool_results": []}
    if state_id == "dispatch_specialists":
        return {
            "specialist_outputs": [
                {
                    "id": "example-leaf",
                    "status": "completed",
                    "findings": [],
                }
            ]
        }
    raise KeyError(f"no simulated output for state {state_id!r}")


def test_drive_skill_through_engine_inline_path(tmp_path: Path) -> None:
    """Drive the spec to terminal via simulated workers + real inline handlers."""
    # Hermetic registry so the test doesn't depend on whatever the
    # process-wide one happens to carry.
    registry = InlineHandlerRegistry()
    registry.register_many(SPEC_ID, INLINE_HANDLERS)

    run_id = uuid.uuid4()
    env: dict[str, Any] = {
        # Pass the tmp_path through so write_run_directory plants its
        # report artefacts under a test-owned directory.
        "args": {"project_root": str(tmp_path), "base": "BASE", "head": "HEAD"},
    }
    current_state = fsm.entry
    visited: list[str] = []
    inline_steps = 0
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
            inline_steps += 1
        else:
            outputs = _simulated_worker_output(state.id)

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

    # Happy-path expected sequence — every state visited in spec order.
    assert visited == [
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
        "terminal",
    ], f"unexpected state path: {visited}"

    # All inline handlers ran (7 along the happy path: risk_tier_triage,
    # activate_leaves, collect_findings, verify_coverage,
    # synthesize_release_readiness, write_run_directory, emit_stdout).
    assert inline_steps == 7

    # write_run_directory wrote three artefacts under .skill-code-review/.
    storage_root = tmp_path / ".skill-code-review"
    assert storage_root.exists(), "write_run_directory didn't write to project_root"
    report_files = list(storage_root.rglob("report.md"))
    assert len(report_files) == 1
    assert (report_files[0].parent / "report.json").exists()
    assert (report_files[0].parent / "manifest.json").exists()
