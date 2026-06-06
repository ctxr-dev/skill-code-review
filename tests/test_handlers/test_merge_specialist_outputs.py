"""Unit coverage for handle_merge_specialist_outputs.

The merger is the loop's safety net: it folds the per-iteration
iter_outputs[] payloads into the legacy specialist_outputs[] list that
collect_findings consumes, persists one JSON shard per
(leaf_id, sub_index) via the sha256-derived shard_path tree, and
asserts the planner-vs-merger union invariant (no missed files).
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

import pytest
from ctxr.fsm.core import InlineContext

from ctxr_skill_code_review.handlers import (
    DispatchLoopExitedEarlyError,
    handle_merge_specialist_outputs,
)
from ctxr_skill_code_review.sharding import shard_path


def _ctx(
    *,
    tmp_path: Path,
    specialist_batches: list[dict[str, Any]],
    total_files_planned: int,
    loop_iters: list[dict[str, Any]],
) -> InlineContext:
    return InlineContext(
        run_id=uuid.uuid4(),
        fsm_id="code-reviewer",
        state_id="merge_specialist_outputs",
        args={"project_root": str(tmp_path)},
        inputs={
            "specialist_batches": specialist_batches,
            "total_files_planned": total_files_planned,
            "loop_iters": loop_iters,
        },
    )


def _unit_batch(
    batch_index: int, units: list[dict[str, Any]]
) -> dict[str, Any]:
    return {"batch_index": batch_index, "units": units}


def _iter_payload(
    batch_index: int,
    rows: list[tuple[str, int, dict[str, Any]]],
    loop_done: bool,
) -> dict[str, Any]:
    return {
        "batch_index": batch_index,
        "iter_outputs": [
            {"leaf_id": lid, "sub_index": sidx, "specialist_output": spec}
            for lid, sidx, spec in rows
        ],
        "loop_done": loop_done,
    }


def test_dedup_keeps_last_iter_for_repeated_unit(tmp_path: Path) -> None:
    """A retried (leaf_id, sub_index) — later iter wins (status updated)."""
    batches = [
        _unit_batch(
            1,
            [
                {
                    "leaf_id": "leaf-a",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["a.py"],
                }
            ],
        )
    ]
    loop_iters = [
        # First attempt failed.
        _iter_payload(
            1,
            [("leaf-a", 1, {"id": "leaf-a", "status": "failed", "findings": []})],
            loop_done=False,
        ),
        # Retried attempt succeeded — last writer wins.
        _iter_payload(
            1,
            [
                (
                    "leaf-a",
                    1,
                    {"id": "leaf-a", "status": "completed", "findings": []},
                )
            ],
            loop_done=True,
        ),
    ]
    out = handle_merge_specialist_outputs(
        _ctx(
            tmp_path=tmp_path,
            specialist_batches=batches,
            total_files_planned=1,
            loop_iters=loop_iters,
        )
    )
    assert len(out["specialist_outputs"]) == 1
    assert out["specialist_outputs"][0]["status"] == "completed"


def test_sharded_path_is_deterministic_across_runs(tmp_path: Path) -> None:
    """Same (leaf_id, sub_index) -> same shard path on every invocation.

    Trunk's :func:`shard_path` is sha256-derived, so determinism is a
    property of the hash, not of the on-disk state. We assert that and
    that distinct unit keys land in different shard directories.
    """
    root = tmp_path / "specialists"
    p1 = shard_path(root, "leaf-a/1", "leaf-a__sub1__iter1.json")
    p2 = shard_path(root, "leaf-a/1", "leaf-a__sub1__iter1.json")
    assert p1 == p2
    # Different sub_index -> different shard dir (different hash input).
    p3 = shard_path(root, "leaf-a/2", "leaf-a__sub2__iter1.json")
    assert p3.parent != p1.parent
    # Different leaf -> different shard root dir.
    p4 = shard_path(root, "leaf-b/1", "leaf-b__sub1__iter1.json")
    assert p4.parent != p1.parent


def test_later_iteration_overwrites_earlier_on_disk(tmp_path: Path) -> None:
    """Two iterations writing the same unit -> last specialist_output wins."""
    batches = [
        _unit_batch(
            1,
            [
                {
                    "leaf_id": "leaf-x",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["x.py"],
                }
            ],
        )
    ]
    loop_iters = [
        _iter_payload(
            1,
            [(
                "leaf-x",
                1,
                {
                    "id": "leaf-x",
                    "status": "completed",
                    "findings": [
                        {"severity": "minor", "file": "x.py", "title": "v1"}
                    ],
                },
            )],
            loop_done=False,
        ),
        _iter_payload(
            1,
            [(
                "leaf-x",
                1,
                {
                    "id": "leaf-x",
                    "status": "completed",
                    "findings": [
                        {"severity": "important", "file": "x.py", "title": "v2"}
                    ],
                },
            )],
            loop_done=True,
        ),
    ]
    out = handle_merge_specialist_outputs(
        _ctx(
            tmp_path=tmp_path,
            specialist_batches=batches,
            total_files_planned=1,
            loop_iters=loop_iters,
        )
    )
    # Last iter's findings survive in the merged output.
    assert len(out["specialist_outputs"]) == 1
    findings = out["specialist_outputs"][0]["findings"]
    assert len(findings) == 1
    assert findings[0]["title"] == "v2"


def test_missed_unit_raises_when_loop_dropped_a_planned_unit(tmp_path: Path) -> None:
    """If the loop body drops a unit, the more-specific DispatchLoopExitedEarlyError fires.

    The planner enumerated 2 units; loop_iters covers only 1. The
    merger's defensive guard catches the missing (leaf_id, sub_index)
    BEFORE the file-union invariant — that gives the orchestrator a
    pointer to the exact missing unit ids instead of a "files dropped"
    statistic.
    """
    # Planner says total_files_planned=2 (both a.py and b.py).
    batches = [
        _unit_batch(
            1,
            [
                {
                    "leaf_id": "leaf-a",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["a.py"],
                },
                {
                    "leaf_id": "leaf-b",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["b.py"],
                },
            ],
        )
    ]
    # Loop body only produced output for leaf-a (leaf-b unit dropped).
    loop_iters = [
        _iter_payload(
            1,
            [(
                "leaf-a",
                1,
                {"id": "leaf-a", "status": "completed", "findings": []},
            )],
            loop_done=True,
        )
    ]
    with pytest.raises(DispatchLoopExitedEarlyError, match="leaf-b#1"):
        handle_merge_specialist_outputs(
            _ctx(
                tmp_path=tmp_path,
                specialist_batches=batches,
                total_files_planned=2,
                loop_iters=loop_iters,
            )
        )


def test_extra_files_above_planned_total_are_allowed(tmp_path: Path) -> None:
    """PR5: the invariant is ``>=``, not ``==``.

    A unit that reviewed MORE files than the planner expected is fine
    — only DROPPED files (union < planned) are a bug. This guards
    against a sub-agent that proactively pulled in a related file the
    planner hadn't enumerated.
    """
    # Planner asked for 1 file; the unit also reviewed a sibling.
    batches = [
        _unit_batch(
            1,
            [
                {
                    "leaf_id": "leaf-a",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["a.py", "a_helper.py"],
                }
            ],
        )
    ]
    loop_iters = [
        _iter_payload(
            1,
            [(
                "leaf-a",
                1,
                {"id": "leaf-a", "status": "completed", "findings": []},
            )],
            loop_done=True,
        )
    ]
    # total_files_planned=1 but union ends up =2 → allowed (>=).
    out = handle_merge_specialist_outputs(
        _ctx(
            tmp_path=tmp_path,
            specialist_batches=batches,
            total_files_planned=1,
            loop_iters=loop_iters,
        )
    )
    assert len(out["specialist_outputs"]) == 1


def test_aggregate_size_guard_truncates_lowest_severity_finding(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """PR5: at-or-above the budget -> drop lowest-severity findings."""
    # Force a tiny budget so the guard fires on a small fixture.
    import ctxr_skill_code_review.handlers as handlers_mod

    monkeypatch.setattr(handlers_mod, "_AGGREGATE_OUTPUT_BUDGET_BYTES", 800)

    # One unit with two findings: a minor and a critical. The minor
    # MUST be dropped first; the critical survives.
    findings = [
        {
            "severity": "minor",
            "file": "big.py",
            "title": "x" * 400,
            "rationale": "y" * 400,
        },
        {
            "severity": "critical",
            "file": "big.py",
            "title": "boom",
            "rationale": "z" * 50,
        },
    ]
    batches = [
        _unit_batch(
            1,
            [
                {
                    "leaf_id": "leaf-big",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["big.py"],
                }
            ],
        )
    ]
    loop_iters = [
        _iter_payload(
            1,
            [(
                "leaf-big",
                1,
                {
                    "id": "leaf-big",
                    "status": "completed",
                    "findings": findings,
                },
            )],
            loop_done=True,
        )
    ]
    out = handle_merge_specialist_outputs(
        _ctx(
            tmp_path=tmp_path,
            specialist_batches=batches,
            total_files_planned=1,
            loop_iters=loop_iters,
        )
    )
    # Leaf survived (envelope intact, count unchanged).
    assert len(out["specialist_outputs"]) == 1
    surviving = out["specialist_outputs"][0]
    assert surviving["id"] == "leaf-big"
    # Minor finding gone; critical preserved.
    severities = [f.get("severity") for f in surviving["findings"]]
    assert "minor" not in severities
    assert "critical" in severities


def test_aggregate_size_guard_never_drops_a_whole_leaf(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """PR5: even at zero-budget, every planned leaf stays in the merge.

    The contract is "trim findings, never drop leaves" so the planner-
    vs-merger union invariant continues to hold. We push the budget
    impossibly low and verify both leaves still appear in the output.
    """
    import ctxr_skill_code_review.handlers as handlers_mod

    monkeypatch.setattr(handlers_mod, "_AGGREGATE_OUTPUT_BUDGET_BYTES", 1)

    batches = [
        _unit_batch(
            1,
            [
                {
                    "leaf_id": "leaf-a",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["a.py"],
                },
                {
                    "leaf_id": "leaf-b",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["b.py"],
                },
            ],
        )
    ]
    loop_iters = [
        _iter_payload(
            1,
            [
                (
                    "leaf-a",
                    1,
                    {
                        "id": "leaf-a",
                        "status": "completed",
                        "findings": [
                            {
                                "severity": "minor",
                                "file": "a.py",
                                "title": "n",
                                "rationale": "p",
                            }
                        ],
                    },
                ),
                (
                    "leaf-b",
                    1,
                    {
                        "id": "leaf-b",
                        "status": "completed",
                        "findings": [
                            {
                                "severity": "important",
                                "file": "b.py",
                                "title": "o",
                                "rationale": "q",
                            }
                        ],
                    },
                ),
            ],
            loop_done=True,
        )
    ]
    out = handle_merge_specialist_outputs(
        _ctx(
            tmp_path=tmp_path,
            specialist_batches=batches,
            total_files_planned=2,
            loop_iters=loop_iters,
        )
    )
    # Both leaves still present (envelopes survive).
    leaf_ids = sorted(o["id"] for o in out["specialist_outputs"])
    assert leaf_ids == ["leaf-a", "leaf-b"]


def test_aggregate_size_guard_noop_below_threshold(tmp_path: Path) -> None:
    """PR5: below the 100 MB budget, the merger is byte-for-byte unchanged."""
    batches = [
        _unit_batch(
            1,
            [
                {
                    "leaf_id": "leaf-x",
                    "sub_index": 1,
                    "total_subs": 1,
                    "files": ["x.py"],
                }
            ],
        )
    ]
    loop_iters = [
        _iter_payload(
            1,
            [(
                "leaf-x",
                1,
                {
                    "id": "leaf-x",
                    "status": "completed",
                    "findings": [
                        {"severity": "minor", "file": "x.py", "title": "t"},
                        {"severity": "critical", "file": "x.py", "title": "u"},
                    ],
                },
            )],
            loop_done=True,
        )
    ]
    out = handle_merge_specialist_outputs(
        _ctx(
            tmp_path=tmp_path,
            specialist_batches=batches,
            total_files_planned=1,
            loop_iters=loop_iters,
        )
    )
    # No trimming — both findings still there.
    assert len(out["specialist_outputs"][0]["findings"]) == 2


def test_shard_files_land_at_expected_paths(tmp_path: Path) -> None:
    """Each (leaf_id, sub_index) materialises a shard JSON on disk."""
    batches = [
        _unit_batch(
            1,
            [
                {
                    "leaf_id": "leaf-a",
                    "sub_index": 1,
                    "total_subs": 2,
                    "files": ["a1.py"],
                },
                {
                    "leaf_id": "leaf-a",
                    "sub_index": 2,
                    "total_subs": 2,
                    "files": ["a2.py"],
                },
            ],
        )
    ]
    loop_iters = [
        _iter_payload(
            1,
            [
                (
                    "leaf-a",
                    1,
                    {"id": "leaf-a", "status": "completed", "findings": []},
                ),
                (
                    "leaf-a",
                    2,
                    {"id": "leaf-a", "status": "completed", "findings": []},
                ),
            ],
            loop_done=True,
        )
    ]
    handle_merge_specialist_outputs(
        _ctx(
            tmp_path=tmp_path,
            specialist_batches=batches,
            total_files_planned=2,
            loop_iters=loop_iters,
        )
    )
    specialists_root = tmp_path / ".skill-code-review" / "specialists"
    # Two distinct shard directories, one per sub_index. Locate them via
    # the shard_path helper so we don't hard-code sha256 buckets.
    p1 = shard_path(specialists_root, "leaf-a/1", "leaf-a__sub1__iter1.json")
    p2 = shard_path(specialists_root, "leaf-a/2", "leaf-a__sub2__iter1.json")
    assert p1.parent != p2.parent
    assert p1.exists()
    assert p2.exists()
    # Shard JSON is well-formed and carries the unit's specialist_output.
    data = json.loads(p1.read_text())
    assert data["id"] == "leaf-a"
    assert data["status"] == "completed"


# ---------------------------------------------------------------------------
# Regression coverage for the dispatch-loop-exited-early diagnostic.
#
# Scenario: the orchestrator dispatched only the FIRST batch's units and
# advanced past dispatch_specialists instead of polling fsm.get_brief for
# the next iteration. The merger must hard-fail with
# DispatchLoopExitedEarlyError listing the missing (leaf_id, sub_index)
# pairs so the operator knows exactly which batches were dropped, instead
# of silently emitting a NO-GO report with most specialists marked failed.
# ---------------------------------------------------------------------------


def test_loop_exited_early_after_first_batch_raises_with_missing_unit_ids(
    tmp_path: Path,
) -> None:
    """Three planned batches, only batch 1's units committed -> raise.

    Mirrors the field-reported bug: 25 picked leaves, planner emits N
    batches, the orchestrator only ran iteration 1. The merger must
    list the absent (leaf_id, sub_index) pairs in the error message so
    the operator can confirm the exact gap.
    """
    # 3 batches with 2 units each = 6 planned units, only first 2 committed.
    batches = []
    for batch_idx in range(1, 4):
        batches.append(
            _unit_batch(
                batch_idx,
                [
                    {
                        "leaf_id": f"leaf-{batch_idx}a",
                        "sub_index": 1,
                        "total_subs": 1,
                        "files": [f"src/{batch_idx}a.py"],
                    },
                    {
                        "leaf_id": f"leaf-{batch_idx}b",
                        "sub_index": 1,
                        "total_subs": 1,
                        "files": [f"src/{batch_idx}b.py"],
                    },
                ],
            )
        )
    # Orchestrator only ran iteration 1: 2 units committed; 4 dropped.
    loop_iters = [
        _iter_payload(
            1,
            [
                (
                    "leaf-1a",
                    1,
                    {"id": "leaf-1a", "status": "completed", "findings": []},
                ),
                (
                    "leaf-1b",
                    1,
                    {"id": "leaf-1b", "status": "completed", "findings": []},
                ),
            ],
            loop_done=True,  # orchestrator wrongly thought it was done
        )
    ]
    with pytest.raises(DispatchLoopExitedEarlyError) as excinfo:
        handle_merge_specialist_outputs(
            _ctx(
                tmp_path=tmp_path,
                specialist_batches=batches,
                total_files_planned=6,
                loop_iters=loop_iters,
            )
        )
    msg = str(excinfo.value)
    # The error names the 4 absent units so the operator can grep them.
    assert "4 of 6" in msg
    for absent in ("leaf-2a#1", "leaf-2b#1", "leaf-3a#1", "leaf-3b#1"):
        assert absent in msg, f"error must list missing unit {absent!r}: {msg!r}"
    # And it points the operator at the actual remediation (resume the loop).
    assert "fsm.get_brief" in msg


def test_loop_exited_early_caps_sample_at_ten_with_overflow_count(
    tmp_path: Path,
) -> None:
    """Error message lists at most 10 missing ids; the rest become "(+N more)".

    Keeps the diagnostic short on a worst-case 50-leaf review where the
    orchestrator dispatched 0 batches. We assert the truncation contract
    rather than dumping every id into the exception.
    """
    # 15 planned units, none committed.
    units = [
        {
            "leaf_id": f"leaf-{n:02d}",
            "sub_index": 1,
            "total_subs": 1,
            "files": [f"src/{n:02d}.py"],
        }
        for n in range(15)
    ]
    batches = [_unit_batch(1, units)]
    loop_iters: list[dict[str, Any]] = []
    with pytest.raises(DispatchLoopExitedEarlyError) as excinfo:
        handle_merge_specialist_outputs(
            _ctx(
                tmp_path=tmp_path,
                specialist_batches=batches,
                total_files_planned=15,
                loop_iters=loop_iters,
            )
        )
    msg = str(excinfo.value)
    assert "15 of 15" in msg
    assert "(+5 more)" in msg


def test_loop_exited_early_during_sharded_leaf_lists_each_subindex(
    tmp_path: Path,
) -> None:
    """A leaf split into 3 sub-batches with only sub_index=1 committed -> 2 missing.

    Sharded leaves were 16 of the 20 specialists in the bug report; the
    diagnostic must distinguish "sub_index=1 ran" from "sub_index=2 and
    sub_index=3 dropped" via the canonical leaf-id#sub-index notation.
    """
    units = [
        {
            "leaf_id": "huge-leaf",
            "sub_index": sidx,
            "total_subs": 3,
            "files": [f"src/h{sidx}.py"],
        }
        for sidx in (1, 2, 3)
    ]
    batches = [_unit_batch(1, units)]
    loop_iters = [
        _iter_payload(
            1,
            [(
                "huge-leaf",
                1,
                {"id": "huge-leaf", "status": "completed", "findings": []},
            )],
            loop_done=True,
        )
    ]
    with pytest.raises(DispatchLoopExitedEarlyError) as excinfo:
        handle_merge_specialist_outputs(
            _ctx(
                tmp_path=tmp_path,
                specialist_batches=batches,
                total_files_planned=3,
                loop_iters=loop_iters,
            )
        )
    msg = str(excinfo.value)
    assert "huge-leaf#2" in msg
    assert "huge-leaf#3" in msg
    # The sub_index that DID run does NOT appear in the missing list.
    # Slice the message past the "Missing:" prefix to avoid false negatives.
    missing_section = msg.split("Missing:", 1)[1]
    assert "huge-leaf#1" not in missing_section


def test_loop_fully_drained_passes_no_diagnostic(tmp_path: Path) -> None:
    """Happy path: every planned unit covered -> merger succeeds, no error.

    This is the regression guard against the new check over-firing on
    correct runs. We use 3 batches with 2 units each and commit every
    iteration; the merger returns 6 specialist_outputs with no fault.
    """
    batches = []
    for batch_idx in range(1, 4):
        batches.append(
            _unit_batch(
                batch_idx,
                [
                    {
                        "leaf_id": f"leaf-{batch_idx}a",
                        "sub_index": 1,
                        "total_subs": 1,
                        "files": [f"src/{batch_idx}a.py"],
                    },
                    {
                        "leaf_id": f"leaf-{batch_idx}b",
                        "sub_index": 1,
                        "total_subs": 1,
                        "files": [f"src/{batch_idx}b.py"],
                    },
                ],
            )
        )
    loop_iters = []
    for batch_idx in range(1, 4):
        loop_iters.append(
            _iter_payload(
                batch_idx,
                [
                    (
                        f"leaf-{batch_idx}a",
                        1,
                        {
                            "id": f"leaf-{batch_idx}a",
                            "status": "completed",
                            "findings": [],
                        },
                    ),
                    (
                        f"leaf-{batch_idx}b",
                        1,
                        {
                            "id": f"leaf-{batch_idx}b",
                            "status": "completed",
                            "findings": [],
                        },
                    ),
                ],
                loop_done=(batch_idx == 3),
            )
        )
    out = handle_merge_specialist_outputs(
        _ctx(
            tmp_path=tmp_path,
            specialist_batches=batches,
            total_files_planned=6,
            loop_iters=loop_iters,
        )
    )
    assert len(out["specialist_outputs"]) == 6
    ids = sorted(o["id"] for o in out["specialist_outputs"])
    assert ids == [
        "leaf-1a", "leaf-1b", "leaf-2a", "leaf-2b", "leaf-3a", "leaf-3b",
    ]
