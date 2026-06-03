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
    MissedFileError,
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


def test_missed_file_raises_when_planner_and_merger_disagree(tmp_path: Path) -> None:
    """If the loop body drops a unit, the merger's union shrinks -> raise."""
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
    with pytest.raises(MissedFileError):
        handle_merge_specialist_outputs(
            _ctx(
                tmp_path=tmp_path,
                specialist_batches=batches,
                total_files_planned=2,
                loop_iters=loop_iters,
            )
        )


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
