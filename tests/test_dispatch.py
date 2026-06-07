"""Tests for the agent-agnostic dispatch helpers: leaf compaction (so a large
activated_leaves set is never truncated mid-array) and rehydration of the heavy
fields stripped for the prompt."""
from __future__ import annotations

import json

from ctxr_skill_code_review.dispatch import (
    _compact_inputs,
    _index_by_id,
    _rehydrate,
    _route_tier,
)


def _big_leaf(i: int) -> dict:
    return {
        "id": f"leaf-{i:03d}", "path": f"x/leaf-{i:03d}.md",
        "activation_match": ["file_globs"], "focus": "f" * 120,
        "dimensions": ["security"] if i % 2 else ["readability"],
        "covers": [f"covers item {j} " * 8 for j in range(18)],  # the bulk
        "audit_surface": ["a" * 200], "tags": ["t1", "t2", "t3"],
    }


def test_compaction_keeps_every_leaf_and_shrinks_payload() -> None:
    """The whole point: compaction must NOT drop leaves (truncation did), only
    slim each one. A 130-leaf raw payload that would exceed any char cap fits."""
    leaves = [_big_leaf(i) for i in range(130)]
    inputs = {"activated_leaves": leaves, "changed_paths": ["a.py"]}
    raw_len = len(json.dumps(inputs, default=str))
    compact = _compact_inputs(inputs)
    comp_len = len(json.dumps(compact, default=str))
    # Same leaf COUNT (no array truncation) ...
    assert len(compact["activated_leaves"]) == 130
    # ... and the alphabetically-late, security leaves survive (the regression).
    ids = [lf["id"] for lf in compact["activated_leaves"]]
    assert "leaf-129" in ids and "leaf-001" in ids
    # ... but materially smaller (covers trimmed to 3, audit_surface dropped).
    assert comp_len < raw_len * 0.5
    assert all("audit_surface" not in lf for lf in compact["activated_leaves"])
    assert all(len(lf.get("covers", [])) <= 3 for lf in compact["activated_leaves"])
    # Non-leaf keys pass through untouched.
    assert compact["changed_paths"] == ["a.py"]


def test_rehydrate_reattaches_stripped_fields_llm_fields_win() -> None:
    source = _index_by_id([_big_leaf(1), _big_leaf(2)])
    picked = [{"id": "leaf-001", "justification": "real bug surface",
               "dimensions": ["correctness"]}]  # LLM output, no covers/path
    out = _rehydrate(picked, source)
    assert len(out) == 1
    # full metadata re-attached from source ...
    assert out[0]["path"] == "x/leaf-001.md"
    assert len(out[0]["covers"]) == 18  # source covers restored
    # ... but the LLM's own fields win.
    assert out[0]["justification"] == "real bug surface"
    assert out[0]["dimensions"] == ["correctness"]


def test_rehydrate_keeps_unknown_ids() -> None:
    out = _rehydrate([{"id": "ghost", "path": "p"}], {})
    assert out == [{"id": "ghost", "path": "p"}]


def test_route_tier_correctness_security_to_strong() -> None:
    assert _route_tier("sec-csrf", ["security"]) == "strong"
    assert _route_tier("lang-python", None) == "strong"
    assert _route_tier("antipattern-copy-paste", ["readability"]) == "cheap"
