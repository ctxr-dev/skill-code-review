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

import pytest
from ctxr.fsm.core.engine import advance as engine_advance
from ctxr.fsm.core.engine import execute_inline
from ctxr.fsm.core.inline_registry import InlineHandlerRegistry
from ctxr.fsm.core.models import RunCtx

from code_review.handlers import INLINE_HANDLERS
from code_review.spec import SPEC_ID, fsm


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
    if state_id == "rank_findings":
        # Neutral ranker worker: re-emit findings (empty on the happy path) +
        # recomputed severity counts.
        return {
            "findings": [],
            "severity_counts": {"critical": 0, "important": 0, "minor": 0},
        }
    if state_id == "dispatch_specialists":
        # PR4: loop body output. The simulated single-iteration loop
        # carries one unit's specialist output and flips loop_done.
        return {
            "batch_index": 1,
            "iter_outputs": [
                {
                    "leaf_id": "example-leaf",
                    "sub_index": 1,
                    "specialist_output": {
                        "id": "example-leaf",
                        "status": "completed",
                        "findings": [],
                    },
                }
            ],
            "loop_done": True,
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
    # PR4: plan_specialist_batches + merge_specialist_outputs join the path.
    assert visited == [
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
        "terminal",
    ], f"unexpected state path: {visited}"

    # All inline handlers ran (9 along the happy path: risk_tier_triage,
    # activate_leaves, plan_specialist_batches, merge_specialist_outputs,
    # collect_findings, verify_coverage, synthesize_release_readiness,
    # write_run_directory, emit_stdout).
    assert inline_steps == 9

    # write_run_directory wrote three artefacts under .skill-code-review/.
    storage_root = tmp_path / ".skill-code-review"
    assert storage_root.exists(), "write_run_directory didn't write to project_root"
    report_files = list(storage_root.rglob("report.md"))
    assert len(report_files) == 1
    assert (report_files[0].parent / "report.json").exists()
    assert (report_files[0].parent / "manifest.json").exists()


# ---------------------------------------------------------------------------
# PR4-specific end-to-end coverage (~80 LOC):
#   - 7 picked leaves + batch_size 3 -> 3 iterations
#   - 1 leaf with 200 files -> 2 sub-batches
#   - Assertions: specialist_outputs length == sum of units; sharded files
#     exist at the expected paths; terminal verdict reached; no missed file.
# ---------------------------------------------------------------------------


def test_pr4_plan_then_merge_seven_leaves_batch_size_three(tmp_path: Path) -> None:
    """Drive plan + merge in isolation: 7 leaves @ batch_size 3 -> 3 batches.

    We assert the planner produces 3 batches (3+3+1) and the merger
    rolls every unit back into a flat specialist_outputs[] list.
    """
    from ctxr.fsm.core import InlineContext

    from code_review.handlers import (
        handle_merge_specialist_outputs,
        handle_plan_specialist_batches,
    )

    picked = [
        {"id": f"leaf-{n}", "path": f"leaf-{n}.md", "activation": {"file_globs": [f"src/m{n}/*.py"]}}
        for n in range(1, 8)
    ]
    changed = [f"src/m{n}/x.py" for n in range(1, 8)]

    plan_ctx = InlineContext(
        run_id=uuid.uuid4(),
        fsm_id="code-reviewer",
        state_id="plan_specialist_batches",
        args={"project_root": str(tmp_path), "batch_size": 3},
        inputs={"picked_leaves": picked, "changed_paths": changed, "tier": "full"},
    )
    plan = handle_plan_specialist_batches(plan_ctx)
    assert plan["total_batches"] == 3
    assert sum(len(b["units"]) for b in plan["specialist_batches"]) == 7

    # Build per-iteration loop payloads — every unit returns a completed output.
    loop_iters = []
    for batch in plan["specialist_batches"]:
        loop_iters.append({
            "batch_index": batch["batch_index"],
            "iter_outputs": [
                {
                    "leaf_id": u["leaf_id"],
                    "sub_index": u["sub_index"],
                    "specialist_output": {
                        "id": u["leaf_id"],
                        "status": "completed",
                        "findings": [],
                    },
                }
                for u in batch["units"]
            ],
            "loop_done": batch["batch_index"] == plan["total_batches"],
        })

    merge_ctx = InlineContext(
        run_id=uuid.uuid4(),
        fsm_id="code-reviewer",
        state_id="merge_specialist_outputs",
        args={"project_root": str(tmp_path)},
        inputs={
            "specialist_batches": plan["specialist_batches"],
            "total_files_planned": plan["total_files_planned"],
            "loop_iters": loop_iters,
        },
    )
    merged = handle_merge_specialist_outputs(merge_ctx)
    assert len(merged["specialist_outputs"]) == 7
    # Sharded files exist under the per-run specialists root.
    specialists_root = tmp_path / ".skill-code-review" / "specialists"
    shards = sorted(specialists_root.rglob("*.json"))
    assert len(shards) == 7


# ---------------------------------------------------------------------------
# Regression coverage for the dispatch-loop-exited-early bug (Fix B).
#
# Simulates a 25-leaf review (the field-reported case). The integration
# test fully drains the loop and asserts every planned unit lands in
# specialist_outputs[]. A companion test demonstrates that the merger
# hard-raises when the orchestrator exits after only the first batch.
# ---------------------------------------------------------------------------


def test_fix_b_orchestrator_drains_25_leaf_dispatch_no_units_lost(
    tmp_path: Path,
) -> None:
    """End-to-end: 25 leaves at batch_size 5 -> 5 iterations, every unit covered.

    Mirrors the bug-report shape (20 picked leaves; many sharded so the
    total dispatch-unit count exceeds the per-iteration batch size).
    We assert:

    * The planner emits 5 batches of 5 units each (25 units total).
    * Driving every iteration through the merger produces 25
      specialist_outputs[] entries (no silent drops).
    * Each (leaf_id, sub_index) shard lands on disk.
    """
    from ctxr.fsm.core import InlineContext

    from code_review.handlers import (
        handle_merge_specialist_outputs,
        handle_plan_specialist_batches,
    )

    picked = [
        {
            "id": f"leaf-{n:02d}",
            "path": f"leaf-{n:02d}.md",
            "activation": {"file_globs": [f"src/m{n:02d}/*.py"]},
        }
        for n in range(1, 26)
    ]
    changed = [f"src/m{n:02d}/x.py" for n in range(1, 26)]

    plan = handle_plan_specialist_batches(
        InlineContext(
            run_id=uuid.uuid4(),
            fsm_id="code-reviewer",
            state_id="plan_specialist_batches",
            args={"project_root": str(tmp_path), "batch_size": 5},
            inputs={"picked_leaves": picked, "changed_paths": changed, "tier": "full"},
        )
    )
    assert plan["total_batches"] == 5
    total_units = sum(len(b["units"]) for b in plan["specialist_batches"])
    assert total_units == 25

    # The drain: drive EVERY iteration. This is the contract the
    # orchestrator must honour — one commit per batch, total commits ==
    # plan.total_batches. Skipping any iteration is the field bug.
    loop_iters = []
    for batch in plan["specialist_batches"]:
        loop_iters.append({
            "batch_index": batch["batch_index"],
            "iter_outputs": [
                {
                    "leaf_id": u["leaf_id"],
                    "sub_index": u["sub_index"],
                    "specialist_output": {
                        "id": u["leaf_id"],
                        "status": "completed",
                        "findings": [],
                    },
                }
                for u in batch["units"]
            ],
            "loop_done": batch["batch_index"] == plan["total_batches"],
        })

    merged = handle_merge_specialist_outputs(
        InlineContext(
            run_id=uuid.uuid4(),
            fsm_id="code-reviewer",
            state_id="merge_specialist_outputs",
            args={"project_root": str(tmp_path)},
            inputs={
                "specialist_batches": plan["specialist_batches"],
                "total_files_planned": plan["total_files_planned"],
                "loop_iters": loop_iters,
            },
        )
    )
    # All 25 units survive the merge.
    assert len(merged["specialist_outputs"]) == 25
    surviving_ids = sorted(o["id"] for o in merged["specialist_outputs"])
    expected_ids = sorted(p["id"] for p in picked)
    assert surviving_ids == expected_ids
    # All 25 shards land on disk.
    shards = sorted((tmp_path / ".skill-code-review" / "specialists").rglob("*.json"))
    assert len(shards) == 25


def test_fix_b_partial_drain_after_first_batch_raises_diagnostic(
    tmp_path: Path,
) -> None:
    """If the orchestrator commits only batch 1, the merger raises.

    This is the field-reported bug shape (orchestrator exited the loop
    after one iteration). The merger MUST hard-fail with
    DispatchLoopExitedEarlyError pointing at the missing batches so
    the operator can resume rather than ship a NO-GO report claiming
    25 specialists failed.
    """
    from ctxr.fsm.core import InlineContext

    from code_review.handlers import (
        DispatchLoopExitedEarlyError,
        handle_merge_specialist_outputs,
        handle_plan_specialist_batches,
    )

    picked = [
        {
            "id": f"leaf-{n:02d}",
            "path": f"leaf-{n:02d}.md",
            "activation": {"file_globs": [f"src/m{n:02d}/*.py"]},
        }
        for n in range(1, 26)
    ]
    changed = [f"src/m{n:02d}/x.py" for n in range(1, 26)]

    plan = handle_plan_specialist_batches(
        InlineContext(
            run_id=uuid.uuid4(),
            fsm_id="code-reviewer",
            state_id="plan_specialist_batches",
            args={"project_root": str(tmp_path), "batch_size": 5},
            inputs={"picked_leaves": picked, "changed_paths": changed, "tier": "full"},
        )
    )

    # Orchestrator ran ONLY iteration 1. The remaining 4 batches (20
    # units) never made it into loop_iters.
    first_batch = plan["specialist_batches"][0]
    loop_iters = [{
        "batch_index": first_batch["batch_index"],
        "iter_outputs": [
            {
                "leaf_id": u["leaf_id"],
                "sub_index": u["sub_index"],
                "specialist_output": {
                    "id": u["leaf_id"],
                    "status": "completed",
                    "findings": [],
                },
            }
            for u in first_batch["units"]
        ],
        "loop_done": True,  # orchestrator wrongly flagged done after iter 1
    }]

    with pytest.raises(DispatchLoopExitedEarlyError) as excinfo:
        handle_merge_specialist_outputs(
            InlineContext(
                run_id=uuid.uuid4(),
                fsm_id="code-reviewer",
                state_id="merge_specialist_outputs",
                args={"project_root": str(tmp_path)},
                inputs={
                    "specialist_batches": plan["specialist_batches"],
                    "total_files_planned": plan["total_files_planned"],
                    "loop_iters": loop_iters,
                },
            )
        )
    msg = str(excinfo.value)
    assert "20 of 25" in msg
    assert "fsm.get_brief" in msg


def test_pr4_huge_leaf_splits_into_subbatches(tmp_path: Path) -> None:
    """One leaf with 200 files at the default token budget -> >= 2 sub-batches."""
    from ctxr.fsm.core import InlineContext

    from code_review.handlers import handle_plan_specialist_batches

    files = [f"src/big/f{i}.py" for i in range(200)]
    picked = [
        {"id": "huge-leaf", "path": "huge.md", "activation": {"file_globs": ["src/big/*.py"]}}
    ]
    ctx = InlineContext(
        run_id=uuid.uuid4(),
        fsm_id="code-reviewer",
        state_id="plan_specialist_batches",
        # max_leaf_tokens=50000 with TOKENS_PER_FILE=500 => 100 files per sub-batch.
        args={"max_leaf_tokens": 50_000, "batch_size": 5},
        inputs={"picked_leaves": picked, "changed_paths": files, "tier": "full"},
    )
    plan = handle_plan_specialist_batches(ctx)
    assert plan["total_batches"] >= 1
    # 200 files / 100 per sub-batch = 2 sub-batches.
    total_units = sum(len(b["units"]) for b in plan["specialist_batches"])
    assert total_units == 2
    assert plan["total_files_planned"] == 200
