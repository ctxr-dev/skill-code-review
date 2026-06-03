"""Unit + end-to-end coverage for the PR5 verifier_stuck handler.

The verifier_stuck inline state is reached when the same worker state
has accumulated three consecutive verifier_rejected events. Its job is
to record the impasse, mark the leaf/batch as failed, and continue the
pipeline with degraded coverage so synthesize_release_readiness lowers
the verdict (a partial-coverage run cannot produce GO).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ctxr_skill_code_review.handlers import (
    _VERIFIER_REJECTION_LIMIT,
    _bump_verifier_rejection_counts,
    _is_verifier_stuck,
    _read_verifier_rejection_counts,
    handle_synthesize_release_readiness,
    handle_verifier_stuck,
    handle_write_run_directory,
)

# ---------------------------------------------------------------------------
# Counter helpers — the env update path the orchestrator drives
# ---------------------------------------------------------------------------


def test_three_consecutive_rejections_flip_is_verifier_stuck(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Three bumps on the same state -> _is_verifier_stuck flips True."""
    counts: dict[str, int] = {}
    state_id = "tree_descend"
    for _ in range(_VERIFIER_REJECTION_LIMIT - 1):
        counts = _bump_verifier_rejection_counts(counts, state_id)
        assert _is_verifier_stuck(counts, state_id) is False
    # The third bump tips it over.
    counts = _bump_verifier_rejection_counts(counts, state_id)
    assert counts[state_id] == _VERIFIER_REJECTION_LIMIT
    assert _is_verifier_stuck(counts, state_id) is True


def test_bumps_on_different_states_dont_aggregate(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """The counter is per-state — a rejection in state A doesn't trip B."""
    counts: dict[str, int] = {}
    counts = _bump_verifier_rejection_counts(counts, "scan_project")
    counts = _bump_verifier_rejection_counts(counts, "scan_project")
    counts = _bump_verifier_rejection_counts(counts, "llm_trim")
    assert counts["scan_project"] == 2
    assert counts["llm_trim"] == 1
    assert _is_verifier_stuck(counts, "scan_project") is False
    assert _is_verifier_stuck(counts, "llm_trim") is False


def test_read_counts_ignores_malformed_entries() -> None:
    """Non-string keys / negative ints / non-dicts collapse to {}."""
    assert _read_verifier_rejection_counts({}) == {}
    assert _read_verifier_rejection_counts({"verifier_rejection_counts": None}) == {}
    raw = {
        "verifier_rejection_counts": {
            "ok_state": 2,
            "neg_state": -1,
            42: 3,
            "bad_value": "three",
        }
    }
    assert _read_verifier_rejection_counts(raw) == {"ok_state": 2}


# ---------------------------------------------------------------------------
# handle_verifier_stuck — impasse record + env handoff
# ---------------------------------------------------------------------------


def test_verifier_stuck_records_impasse_and_marks_degraded(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """The handler captures the stuck state id + flips degraded_run."""
    ctx = make_ctx(
        state_id="verifier_stuck",
        inputs={
            "verifier_rejection_counts": {
                "tree_descend": _VERIFIER_REJECTION_LIMIT,
                "scan_project": 1,
            },
            "current_leaf_id": "leaf-foo",
            "current_batch_index": 2,
        },
    )
    out = handle_verifier_stuck(ctx)
    assert out["degraded_run"] is True
    # Stuck state correctly picked from the counts dict.
    assert out["verifier_stuck"]["stuck_state_id"] == "tree_descend"
    assert out["verifier_stuck"]["rejection_count"] == _VERIFIER_REJECTION_LIMIT
    assert out["verifier_stuck"]["limit"] == _VERIFIER_REJECTION_LIMIT
    # Counter reset for the stuck state; others untouched.
    assert out["verifier_rejection_counts"]["tree_descend"] == 0
    assert out["verifier_rejection_counts"]["scan_project"] == 1
    # Failed units carry both the leaf and the batch marker.
    reasons = {u.get("reason") for u in out["failed_units"]}
    assert reasons == {"verifier_stuck"}


def test_verifier_stuck_honours_explicit_stuck_state_override(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """``stuck_state_id`` in env wins over scanning the counts dict."""
    ctx = make_ctx(
        state_id="verifier_stuck",
        inputs={
            "verifier_rejection_counts": {
                "llm_trim": _VERIFIER_REJECTION_LIMIT,
                "tool_discovery": _VERIFIER_REJECTION_LIMIT,
            },
            "stuck_state_id": "tool_discovery",
        },
    )
    out = handle_verifier_stuck(ctx)
    assert out["verifier_stuck"]["stuck_state_id"] == "tool_discovery"
    assert out["verifier_rejection_counts"]["tool_discovery"] == 0
    # llm_trim's count is preserved — only the explicit stuck state resets.
    assert out["verifier_rejection_counts"]["llm_trim"] == _VERIFIER_REJECTION_LIMIT


def test_verifier_stuck_empty_env_still_returns_valid_envelope(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """No counts + no leaf id -> stuck_state_id='', failed_units=[]."""
    out = handle_verifier_stuck(make_ctx(state_id="verifier_stuck"))
    assert out["degraded_run"] is True
    assert out["verifier_stuck"]["stuck_state_id"] == ""
    assert out["verifier_stuck"]["rejection_count"] == 0
    assert out["failed_units"] == []
    assert out["verifier_rejection_counts"] == {}


# ---------------------------------------------------------------------------
# End-to-end: verifier_stuck -> degraded pipeline still produces report.md
# ---------------------------------------------------------------------------


def _picked_leaves() -> list[dict[str, Any]]:
    return [
        {
            "id": "leaf-a",
            "path": "wiki/leaf-a.md",
            "dimensions": ["correctness"],
            "tags": ["error-handling"],
        }
    ]


def test_end_to_end_verifier_stuck_still_produces_report(
    tmp_path: Path, make_ctx,  # type: ignore[no-untyped-def]
) -> None:
    """A run that hits verifier_stuck still emits report.md (degraded)."""
    # Step 1: verifier_stuck records the impasse.
    stuck_out = handle_verifier_stuck(
        make_ctx(
            state_id="verifier_stuck",
            inputs={
                "verifier_rejection_counts": {
                    "tree_descend": _VERIFIER_REJECTION_LIMIT,
                },
            },
        )
    )
    assert stuck_out["degraded_run"] is True

    # Step 2: synthesize_release_readiness consumes the degraded env;
    # because findings is empty + no gates hit, verdict is GO normally,
    # but the orchestrator-side aggregation would mark coverage as
    # incomplete via coverage_rule_violated. We simulate that here.
    synth_ctx = make_ctx(
        state_id="synthesize_release_readiness",
        inputs={
            "findings": [],
            "picked_leaves": _picked_leaves(),
            "coverage_rule_violated": True,
            "degraded_run": stuck_out["degraded_run"],
        },
    )
    synth_out = handle_synthesize_release_readiness(synth_ctx)
    # Coverage rule violation forces NO-GO — degraded verdict path.
    assert synth_out["verdict"] == "NO-GO"
    assert len(synth_out["gates"]) == 8

    # Step 3: write_run_directory still emits report.md on disk.
    write_ctx = make_ctx(
        state_id="write_run_directory",
        args={"project_root": str(tmp_path)},
        inputs={
            "verdict": synth_out["verdict"],
            "gates": synth_out["gates"],
            "findings": [],
            "severity_counts": {"critical": 0, "important": 0, "minor": 0},
            "coverage_matrix": [],
            "coverage_gaps": [],
            "picked_leaves": _picked_leaves(),
            "changed_paths": ["src/foo.py"],
            "degraded_run": True,
            "verifier_stuck": stuck_out["verifier_stuck"],
        },
    )
    write_out = handle_write_run_directory(write_ctx)
    run_dir = Path(write_out["run_dir_path"])
    assert run_dir.exists()
    report_md = run_dir / "report.md"
    assert report_md.exists()
    body = report_md.read_text()
    assert "NO-GO" in body
    # Manifest captures the run metadata.
    manifest = json.loads((run_dir / "manifest.json").read_text())
    assert manifest.get("verdict") == "NO-GO"


# ---------------------------------------------------------------------------
# Spec wiring — verifier_stuck is a registered state with a handler
# ---------------------------------------------------------------------------


def test_verifier_stuck_state_is_wired_into_spec() -> None:
    """The 18th state has the right id + handler binding."""
    from ctxr_skill_code_review.handlers import INLINE_HANDLERS
    from ctxr_skill_code_review.spec import HandlerId, build_spec

    spec = build_spec()
    state_ids = [s.id for s in spec.states]
    assert "verifier_stuck" in state_ids

    stuck = next(s for s in spec.states if s.id == "verifier_stuck")
    assert stuck.inline is not None
    assert stuck.inline.handler_id == HandlerId.verifier_stuck.value
    # Transitions back into the pipeline so a final report still lands.
    assert stuck.transitions and stuck.transitions[0].to == "synthesize_release_readiness"
    # Handler is registered.
    assert HandlerId.verifier_stuck.value in INLINE_HANDLERS
