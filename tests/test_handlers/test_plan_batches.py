"""Unit coverage for handle_plan_specialist_batches.

The planner is deterministic and pure: given the same picked_leaves +
changed_paths + tier (+ optional batch_size / max_leaf_tokens), it must
produce the same specialist_batches[]. The tests cover:

* The tier-driven default batch size when args.batch_size is absent.
* The packing rule (units per batch == batch_size, last batch shorter).
* The sub-batch split for a single huge leaf that would exceed the
  per-leaf token budget.
* The keyword-only fallback (no activation.file_globs) — gets the full
  changed_paths set.
* total_files_planned consistency: it equals the size of the union of
  every unit's files[].
"""

from __future__ import annotations

import uuid
from typing import Any

from ctxr.fsm.core import InlineContext

from code_review.handlers import handle_plan_specialist_batches


def _ctx(
    *,
    picked_leaves: list[dict[str, Any]],
    changed_paths: list[str],
    tier: str = "lite",
    args: dict[str, Any] | None = None,
) -> InlineContext:
    return InlineContext(
        run_id=uuid.uuid4(),
        fsm_id="code-reviewer",
        state_id="plan_specialist_batches",
        args=args or {},
        inputs={
            "picked_leaves": picked_leaves,
            "changed_paths": changed_paths,
            "tier": tier,
        },
    )


def test_small_leafset_lite_tier_packs_into_one_batch() -> None:
    """3 leaves @ lite tier (default batch_size=4) -> 1 batch with 3 units."""
    picked = [
        {"id": f"leaf-{n}", "path": f"l{n}.md", "activation": {"file_globs": [f"src/{n}.py"]}}
        for n in range(1, 4)
    ]
    changed = [f"src/{n}.py" for n in range(1, 4)]
    out = handle_plan_specialist_batches(
        _ctx(picked_leaves=picked, changed_paths=changed, tier="lite")
    )
    assert out["total_batches"] == 1
    assert len(out["specialist_batches"]) == 1
    assert len(out["specialist_batches"][0]["units"]) == 3
    assert out["specialist_batches"][0]["batch_index"] == 1


def test_many_leaves_full_tier_packs_into_three_batches() -> None:
    """15 leaves @ full tier (default batch_size=5) -> 3 batches (5 + 5 + 5)."""
    picked = [
        {"id": f"leaf-{n}", "path": f"l{n}.md", "activation": {"file_globs": [f"src/{n}.py"]}}
        for n in range(1, 16)
    ]
    changed = [f"src/{n}.py" for n in range(1, 16)]
    out = handle_plan_specialist_batches(
        _ctx(picked_leaves=picked, changed_paths=changed, tier="full")
    )
    assert out["total_batches"] == 3
    assert all(len(b["units"]) == 5 for b in out["specialist_batches"])
    assert [b["batch_index"] for b in out["specialist_batches"]] == [1, 2, 3]


def test_huge_leaf_splits_into_non_overlapping_sub_batches() -> None:
    """One leaf with 100 files at max_leaf_tokens 40000 -> 2 sub-batches.

    100 files * 500 tokens/file = 50000 estimated tokens, exceeds the
    40000 cap, so the planner splits into ceil(50000/40000) = 2 sub-
    batches with non-overlapping file slices.
    """
    files = [f"src/big/f{i}.py" for i in range(100)]
    picked = [
        {"id": "big", "path": "big.md", "activation": {"file_globs": ["src/big/*.py"]}}
    ]
    out = handle_plan_specialist_batches(
        _ctx(
            picked_leaves=picked,
            changed_paths=files,
            tier="full",
            args={"max_leaf_tokens": 40_000, "batch_size": 5},
        )
    )
    units = [u for b in out["specialist_batches"] for u in b["units"]]
    assert len(units) == 2
    assert {u["sub_index"] for u in units} == {1, 2}
    assert all(u["total_subs"] == 2 for u in units)
    # Non-overlapping file slices: the union should equal the input.
    union: set[str] = set()
    for u in units:
        u_files = set(u["files"])
        # Disjointness check: a slice cannot collide with an earlier one.
        assert union.isdisjoint(u_files), f"sub-batch slices overlap: {u_files & union}"
        union.update(u_files)
    assert union == set(files)


def test_keyword_only_leaf_assigned_all_changed_paths() -> None:
    """A leaf with no activation.file_globs picks up the full diff scope."""
    picked = [
        {"id": "kw-only", "path": "kw.md", "activation": {"keyword_matches": ["foo"]}}
    ]
    changed = ["a.py", "b.py", "c.py"]
    out = handle_plan_specialist_batches(
        _ctx(picked_leaves=picked, changed_paths=changed, tier="lite")
    )
    assert len(out["specialist_batches"]) == 1
    unit = out["specialist_batches"][0]["units"][0]
    assert set(unit["files"]) == set(changed)
    assert unit["sub_index"] == 1
    assert unit["total_subs"] == 1


def test_total_files_planned_equals_union_size() -> None:
    """The planner's total_files_planned doubles as the merger's invariant target."""
    picked = [
        {"id": "a", "path": "a.md", "activation": {"file_globs": ["src/a/*.py"]}},
        {"id": "b", "path": "b.md", "activation": {"file_globs": ["src/b/*.py"]}},
        # Overlapping leaf: both 'a' and 'overlap' touch src/a/x.py — the
        # union should count src/a/x.py once.
        {"id": "overlap", "path": "o.md", "activation": {"file_globs": ["src/a/x.py"]}},
    ]
    changed = ["src/a/x.py", "src/a/y.py", "src/b/z.py", "docs/readme.md"]
    out = handle_plan_specialist_batches(
        _ctx(picked_leaves=picked, changed_paths=changed, tier="lite")
    )
    union: set[str] = set()
    for b in out["specialist_batches"]:
        for u in b["units"]:
            union.update(u["files"])
    assert out["total_files_planned"] == len(union)
    # docs/readme.md isn't matched by any leaf -> not in union.
    assert "docs/readme.md" not in union
    # src/a/x.py is in both 'a' and 'overlap' -> still only one in union.
    assert "src/a/x.py" in union


def test_explicit_batch_size_arg_overrides_tier_default() -> None:
    """args.batch_size beats the tier-driven default when supplied."""
    picked = [
        {"id": f"l{n}", "path": f"l{n}.md", "activation": {"file_globs": [f"f{n}.py"]}}
        for n in range(6)
    ]
    changed = [f"f{n}.py" for n in range(6)]
    out = handle_plan_specialist_batches(
        _ctx(
            picked_leaves=picked,
            changed_paths=changed,
            tier="lite",  # would default to 4
            args={"batch_size": 2},
        )
    )
    assert out["total_batches"] == 3
    assert all(len(b["units"]) == 2 for b in out["specialist_batches"])


def test_leaf_with_no_matched_files_still_emits_a_unit() -> None:
    """A leaf whose globs match nothing in the diff still gets a unit slot."""
    picked = [
        {"id": "no-match", "path": "n.md", "activation": {"file_globs": ["nonexistent/*.go"]}}
    ]
    changed = ["src/foo.py"]
    out = handle_plan_specialist_batches(
        _ctx(picked_leaves=picked, changed_paths=changed, tier="lite")
    )
    assert out["total_batches"] == 1
    unit = out["specialist_batches"][0]["units"][0]
    assert unit["leaf_id"] == "no-match"
    assert unit["files"] == []


def test_zero_picked_leaves_emits_zero_batches() -> None:
    """No picked_leaves -> no units -> 0 batches.

    Regression marker for run 019e93cb: when an upstream env-threading
    bug drops picked_leaves before this handler runs, the handler is
    expected to emit ``total_batches == 0`` (NOT to crash). The
    spec-level post_validation
    ``(len(picked_leaves) == 0) OR (total_batches > 0)`` then takes
    over: it PASSES this case (0 == 0) but would FAIL the buggy case
    (picked_leaves dropped from env -> the handler still emits 0
    batches but the predicate disagrees, surfacing the upstream bug).

    The follow-on spec transition routes 0-batch runs directly to
    merge_specialist_outputs so the empty Loop is skipped entirely;
    see ``tests/test_handlers/test_loop_empty_path.py`` for that path.
    """
    out = handle_plan_specialist_batches(
        _ctx(picked_leaves=[], changed_paths=["src/a.py", "src/b.py"], tier="lite")
    )
    assert out["total_batches"] == 0
    assert out["specialist_batches"] == []
    assert out["total_files_planned"] == 0


def test_single_small_leaf_produces_single_batch() -> None:
    """One leaf with a small file set -> 1 batch, 1 unit, 1 sub-index.

    Matches the audit's "1 leaf small -> 1 batch" repro shape.
    """
    picked = [
        {"id": "leaf-1", "path": "leaf-1.md", "activation": {"file_globs": ["src/*.py"]}}
    ]
    out = handle_plan_specialist_batches(
        _ctx(picked_leaves=picked, changed_paths=["src/a.py", "src/b.py"], tier="lite")
    )
    assert out["total_batches"] == 1
    assert len(out["specialist_batches"][0]["units"]) == 1
    unit = out["specialist_batches"][0]["units"][0]
    assert unit["sub_index"] == 1
    assert unit["total_subs"] == 1
    assert set(unit["files"]) == {"src/a.py", "src/b.py"}


def test_single_huge_leaf_splits_into_multiple_sub_batches() -> None:
    """The audit's "1 huge leaf -> sub-batches" case, exercised end-to-end.

    300 files * 500 tokens = 150_000 estimated; cap 50_000 ->
    ceil(150_000 / 50_000) = 3 sub-batches.
    """
    files = [f"src/huge/f{i}.py" for i in range(300)]
    picked = [
        {"id": "huge", "path": "huge.md", "activation": {"file_globs": ["src/huge/*.py"]}}
    ]
    out = handle_plan_specialist_batches(
        _ctx(
            picked_leaves=picked,
            changed_paths=files,
            tier="full",
            args={"max_leaf_tokens": 50_000, "batch_size": 5},
        )
    )
    units = [u for b in out["specialist_batches"] for u in b["units"]]
    assert len(units) == 3
    assert {u["sub_index"] for u in units} == {1, 2, 3}
    assert all(u["total_subs"] == 3 for u in units)
    # Disjoint slices, covering the full input.
    union: set[str] = set()
    for u in units:
        u_files = set(u["files"])
        assert union.isdisjoint(u_files), f"overlap: {u_files & union}"
        union.update(u_files)
    assert union == set(files)
